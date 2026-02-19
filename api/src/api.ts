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

function _jsonResponse(body: Record<string, unknown>, status: number, headers: Record<string, string>): Response {
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
