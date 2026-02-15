export { ChatRoom } from "./chat-room.js";

interface Env {
  CHAT_ROOM: DurableObjectNamespace;
  ADMIN_SECRET: string;
  ALLOWED_ORIGIN: string;
  OPENAI_API_KEY: string;
}

function corsHeaders(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed =
    origin === env.ALLOWED_ORIGIN || origin.startsWith("http://localhost");

  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env, request),
      });
    }

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket upgrade", { status: 426 });
      }

      const roomId = env.CHAT_ROOM.idFromName("global");
      const room = env.CHAT_ROOM.get(roomId);
      return room.fetch(request);
    }

    // Auth endpoint
    if (url.pathname === "/auth" && request.method === "POST") {
      const headers = corsHeaders(env, request);

      try {
        const body = (await request.json()) as { token?: string };

        if (body.token === env.ADMIN_SECRET) {
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...headers, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: false }), {
          status: 401,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Invalid request" }), {
          status: 400,
          headers: { ...headers, "Content-Type": "application/json" },
        });
      }
    }

    // Health check
    if (url.pathname === "/") {
      return new Response("ok", {
        headers: corsHeaders(env, request),
      });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
