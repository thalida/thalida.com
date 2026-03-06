import type { Env, AuthRequest, ApiConfigResponse } from "./types";
import { ADMIN_USERNAME } from "./config";
import { createSessionToken, timingSafeEqual } from "./session";

// Auth rate limiting: max 10 failed attempts per IP in a 5-minute window (SEC-API-2)
const AUTH_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX_FAILURES = 10;
const authFailures = new Map<string, number[]>();

function isAuthRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - AUTH_RATE_LIMIT_WINDOW_MS;
  let times = authFailures.get(ip);

  if (!times) return false;

  // Prune old entries
  times = times.filter((t) => t >= cutoff);
  if (times.length === 0) {
    authFailures.delete(ip);
    return false;
  }
  authFailures.set(ip, times);

  return times.length >= AUTH_RATE_LIMIT_MAX_FAILURES;
}

function recordAuthFailure(ip: string): void {
  let times = authFailures.get(ip);
  if (!times) {
    times = [];
    authFailures.set(ip, times);
  }
  times.push(Date.now());
}

export function isAllowedOrigin(env: Env, origin: string): boolean {
  return (
    origin === env.ALLOWED_ORIGIN ||
    /^https:\/\/[\w-]+\.thalida-com\.pages\.dev$/.test(origin) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin)
  );
}

function corsHeaders(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(env, origin) ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(body: object, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export function handleCors(env: Env, request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(env, request),
  });
}

export async function handleWebSocket(env: Env, request: Request): Promise<Response> {
  if (request.headers.get("Upgrade") !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  // Validate WebSocket origin (SEC-API-1)
  const origin = request.headers.get("Origin");
  if (!origin || !isAllowedOrigin(env, origin)) {
    return new Response("Forbidden origin", { status: 403 });
  }

  const roomId = env.CHAT_ROOM.idFromName("global");
  const room = env.CHAT_ROOM.get(roomId);
  return room.fetch(request);
}

export async function handleAuth(env: Env, request: Request): Promise<Response> {
  const headers = corsHeaders(env, request);
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";

  // Rate limiting on auth endpoint (SEC-API-2)
  if (isAuthRateLimited(ip)) {
    return jsonResponse({ error: "Too many attempts. Try again later." }, 429, headers);
  }

  try {
    const body = (await request.json()) as AuthRequest;

    if (
      typeof body.token === "string" &&
      body.token.length > 0 &&
      (await timingSafeEqual(body.token, env.ADMIN_PASSWORD))
    ) {
      const sessionToken = await createSessionToken(env.SIGNING_SECRET);
      return jsonResponse({ sessionToken }, 200, headers);
    }

    recordAuthFailure(ip);
    return jsonResponse({}, 401, headers);
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400, headers);
  }
}

export function handleConfig(env: Env, request: Request): Response {
  const body: ApiConfigResponse = { adminUsername: env.ADMIN_USERNAME || ADMIN_USERNAME };
  return jsonResponse(body, 200, corsHeaders(env, request));
}

export function handleHealthCheck(env: Env, request: Request): Response {
  return jsonResponse({}, 200, corsHeaders(env, request));
}

export async function handleLocation(env: Env, request: Request): Promise<Response> {
  const headers = corsHeaders(env, request);

  if (!env.IPREGISTRY_KEY) {
    return jsonResponse({ error: "Location service not configured" }, 503, headers);
  }

  const rawIp = request.headers.get("CF-Connecting-IP") ?? "";
  const ip = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fd|fc)/.test(rawIp) ? "" : rawIp;

  try {
    const res = await fetch(`https://api.ipregistry.co/${ip}?key=${env.IPREGISTRY_KEY}&fields=location,time_zone`);
    if (!res.ok) {
      const body = await res.text();
      console.error(`[location] IP Registry error ${res.status}: ${body}`);
      return jsonResponse({ error: "Upstream location service error" }, 502, headers);
    }

    const data = (await res.json()) as {
      location?: { latitude?: number; longitude?: number; country?: { code?: string }; city?: string };
      time_zone?: { id?: string };
    };

    return jsonResponse(
      {
        lat: data.location?.latitude ?? null,
        lng: data.location?.longitude ?? null,
        country: data.location?.country?.code ?? null,
        name: data.location?.city ?? null,
        timezone: data.time_zone?.id ?? null,
      },
      200,
      headers,
    );
  } catch {
    return jsonResponse({ error: "Location lookup failed" }, 502, headers);
  }
}

export async function handleWeather(env: Env, request: Request): Promise<Response> {
  const headers = corsHeaders(env, request);

  if (!env.OPENWEATHER_KEY) {
    return jsonResponse({ error: "Weather service not configured" }, 503, headers);
  }

  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  const units = url.searchParams.get("units") || "metric";

  if (!lat || !lon) {
    return jsonResponse({ error: "lat and lon query params required" }, 400, headers);
  }

  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (Number.isNaN(latNum) || Number.isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return jsonResponse({ error: "lat must be -90..90 and lon must be -180..180" }, 400, headers);
  }

  const ALLOWED_UNITS = ["metric", "imperial", "standard"];
  if (!ALLOWED_UNITS.includes(units)) {
    return jsonResponse({ error: `units must be one of: ${ALLOWED_UNITS.join(", ")}` }, 400, headers);
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?units=${encodeURIComponent(units)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${env.OPENWEATHER_KEY}`,
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(`[weather] OpenWeather error ${res.status}: ${body}`);
      return jsonResponse({ error: "Upstream weather service error" }, 502, headers);
    }

    const data = (await res.json()) as {
      weather?: Array<{ main?: string; description?: string; icon?: string }>;
      main?: { temp?: number };
      sys?: { sunrise?: number; sunset?: number };
    };

    return jsonResponse(
      {
        main: data.weather?.[0]?.main ?? null,
        description: data.weather?.[0]?.description ?? null,
        icon: data.weather?.[0]?.icon ?? null,
        temp: data.main?.temp ?? null,
        sunrise: data.sys?.sunrise ?? null,
        sunset: data.sys?.sunset ?? null,
      },
      200,
      headers,
    );
  } catch {
    return jsonResponse({ error: "Weather lookup failed" }, 502, headers);
  }
}
