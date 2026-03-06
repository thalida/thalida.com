import type { Env, ApiConfigResponse } from "./types";
import { ADMIN_USERNAME } from "./config";

export function isAllowedOrigin(env: Env, origin: string): boolean {
  return (
    origin === env.ALLOWED_ORIGIN ||
    /^https:\/\/[\w-]+\.thalida-com\.pages\.dev$/.test(origin) ||
    /^http:\/\/localhost(:\d+)?$/.test(origin)
  );
}

export function corsHeaders(env: Env, request: Request): Record<string, string> {
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

  const origin = request.headers.get("Origin");
  if (!origin || !isAllowedOrigin(env, origin)) {
    return new Response("Forbidden origin", { status: 403 });
  }

  const roomId = env.CHAT_ROOM.idFromName("global");
  const room = env.CHAT_ROOM.get(roomId);
  return room.fetch(request);
}

export function handleConfig(env: Env, request: Request): Response {
  const body: ApiConfigResponse = { adminUsername: env.ADMIN_USERNAME || ADMIN_USERNAME };
  return jsonResponse(body, 200, corsHeaders(env, request));
}

export function handleHealthCheck(env: Env, request: Request): Response {
  return jsonResponse({}, 200, corsHeaders(env, request));
}
