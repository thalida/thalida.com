export { ChatRoom } from "./chat-room";
export type * from "./types";

import type { Env } from "./types";
import { handleCors, handleWebSocket, handleConfig, handleHealthCheck, corsHeaders } from "./api";
import { handleAuth } from "./auth";
import { handleLocation, handleWeather } from "./proxy";

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return handleCors(env, request);
    } else if (url.pathname === "/ws") {
      return handleWebSocket(env, request);
    } else if (url.pathname === "/auth" && request.method === "POST") {
      return handleAuth(env, request, corsHeaders(env, request));
    } else if (url.pathname === "/config") {
      return handleConfig(env, request);
    } else if (url.pathname === "/location") {
      return handleLocation(env, request, corsHeaders(env, request));
    } else if (url.pathname === "/weather") {
      return handleWeather(env, request, corsHeaders(env, request));
    } else if (url.pathname === "/") {
      return handleHealthCheck(env, request);
    } else {
      return new Response("Not found", { status: 404, headers: corsHeaders(env, request) });
    }
  },
} satisfies ExportedHandler<Env>;
