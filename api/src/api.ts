import type { Env, AuthRequest, ApiConfigResponse } from "./types";
import { ADMIN_USERNAME } from "./config";

function _corsHeaders(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed =
    origin === env.ALLOWED_ORIGIN ||
    /^https:\/\/[\w-]+\.thalida-com\.pages\.dev$/.test(origin) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin);

  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function _jsonResponse(body: object, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export function handleCors(env: Env, request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: _corsHeaders(env, request),
  });
}

export async function handleWebSocket(env: Env, request: Request): Promise<Response> {
  if (request.headers.get("Upgrade") !== "websocket") {
    return new Response("Expected WebSocket upgrade", { status: 426 });
  }

  const roomId = env.CHAT_ROOM.idFromName("global");
  const room = env.CHAT_ROOM.get(roomId);
  return room.fetch(request);
}

export async function handleAuth(env: Env, request: Request): Promise<Response> {
  const headers = _corsHeaders(env, request);

  try {
    const body = (await request.json()) as AuthRequest;

    if (body.token === env.ADMIN_SECRET) {
      return _jsonResponse({}, 200, headers);
    }

    return _jsonResponse({}, 401, headers);
  } catch {
    return _jsonResponse({ error: "Invalid request" }, 400, headers);
  }
}

export function handleConfig(env: Env, request: Request): Response {
  const body: ApiConfigResponse = { adminUsername: ADMIN_USERNAME };
  return _jsonResponse(body, 200, _corsHeaders(env, request));
}

export function handleHealthCheck(env: Env, request: Request): Response {
  return _jsonResponse({}, 200, _corsHeaders(env, request));
}

export async function handleLocation(env: Env, request: Request): Promise<Response> {
  const headers = _corsHeaders(env, request);

  if (!env.IPREGISTRY_KEY) {
    return _jsonResponse({ error: "Location service not configured" }, 503, headers);
  }

  const rawIp = request.headers.get("CF-Connecting-IP") ?? "";
  const ip = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fd|fc)/.test(rawIp) ? "" : rawIp;

  try {
    const res = await fetch(`https://api.ipregistry.co/${ip}?key=${env.IPREGISTRY_KEY}&fields=location,time_zone`);
    if (!res.ok) {
      const body = await res.text();
      console.error(`[location] IP Registry error ${res.status}: ${body}`);
      return _jsonResponse({ error: "Upstream location service error" }, 502, headers);
    }

    const data = (await res.json()) as {
      location?: { latitude?: number; longitude?: number; country?: { code?: string }; city?: string };
      time_zone?: { id?: string };
    };

    return _jsonResponse(
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
    return _jsonResponse({ error: "Location lookup failed" }, 502, headers);
  }
}

export async function handleWeather(env: Env, request: Request): Promise<Response> {
  const headers = _corsHeaders(env, request);

  if (!env.OPENWEATHER_KEY) {
    return _jsonResponse({ error: "Weather service not configured" }, 503, headers);
  }

  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  const units = url.searchParams.get("units") || "metric";

  if (!lat || !lon) {
    return _jsonResponse({ error: "lat and lon query params required" }, 400, headers);
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?units=${encodeURIComponent(units)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${env.OPENWEATHER_KEY}`,
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(`[weather] OpenWeather error ${res.status}: ${body}`);
      return _jsonResponse({ error: "Upstream weather service error" }, 502, headers);
    }

    const data = (await res.json()) as {
      weather?: Array<{ main?: string; description?: string; icon?: string }>;
      main?: { temp?: number };
      sys?: { sunrise?: number; sunset?: number };
    };

    return _jsonResponse(
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
    return _jsonResponse({ error: "Weather lookup failed" }, 502, headers);
  }
}
