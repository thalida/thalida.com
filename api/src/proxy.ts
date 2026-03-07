import type { Env } from "./types";

const ALLOWED_UNITS = ["metric", "imperial", "standard"];

function jsonResponse(body: object, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export async function handleLocation(
  env: Env,
  request: Request,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (!env.IPREGISTRY_KEY) {
    return jsonResponse({ error: "Location service not configured" }, 503, corsHeaders);
  }

  const rawIp = request.headers.get("CF-Connecting-IP") ?? "";
  const ip = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fd|fc)/.test(rawIp) ? "" : rawIp;

  try {
    const res = await fetch(`https://api.ipregistry.co/${ip}?key=${env.IPREGISTRY_KEY}&fields=location,time_zone`);
    if (!res.ok) {
      const body = await res.text();
      console.error(`[location] IP Registry error ${res.status}: ${body}`);
      return jsonResponse({ error: "Upstream location service error" }, 502, corsHeaders);
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
      corsHeaders,
    );
  } catch {
    return jsonResponse({ error: "Location lookup failed" }, 502, corsHeaders);
  }
}

export async function handleWeather(
  env: Env,
  request: Request,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (!env.OPENWEATHER_KEY) {
    return jsonResponse({ error: "Weather service not configured" }, 503, corsHeaders);
  }

  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  const units = url.searchParams.get("units") || "metric";

  if (!lat || !lon) {
    return jsonResponse({ error: "lat and lon query params required" }, 400, corsHeaders);
  }

  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (Number.isNaN(latNum) || Number.isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return jsonResponse({ error: "lat must be -90..90 and lon must be -180..180" }, 400, corsHeaders);
  }

  if (!ALLOWED_UNITS.includes(units)) {
    return jsonResponse({ error: `units must be one of: ${ALLOWED_UNITS.join(", ")}` }, 400, corsHeaders);
  }

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?units=${encodeURIComponent(units)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&appid=${env.OPENWEATHER_KEY}`,
    );
    if (!res.ok) {
      const body = await res.text();
      console.error(`[weather] OpenWeather error ${res.status}: ${body}`);
      return jsonResponse({ error: "Upstream weather service error" }, 502, corsHeaders);
    }

    const data = (await res.json()) as {
      weather?: Array<{ id?: number; main?: string; description?: string; icon?: string }>;
      main?: { temp?: number };
      sys?: { sunrise?: number; sunset?: number };
    };

    return jsonResponse(
      {
        id: data.weather?.[0]?.id ?? null,
        main: data.weather?.[0]?.main ?? null,
        description: data.weather?.[0]?.description ?? null,
        icon: data.weather?.[0]?.icon ?? null,
        temp: data.main?.temp ?? null,
        sunrise: data.sys?.sunrise ?? null,
        sunset: data.sys?.sunset ?? null,
      },
      200,
      corsHeaders,
    );
  } catch {
    return jsonResponse({ error: "Weather lookup failed" }, 502, corsHeaders);
  }
}
