import type { Env, AuthRequest } from "./types";
import { createSessionToken, timingSafeEqual } from "./session";
import { AUTH_RATE_LIMIT_WINDOW_MS, AUTH_RATE_LIMIT_MAX_FAILURES } from "./config";
const authFailures = new Map<string, number[]>();

function isAuthRateLimited(ip: string): boolean {
  const now = Date.now();
  const cutoff = now - AUTH_RATE_LIMIT_WINDOW_MS;
  let times = authFailures.get(ip);

  if (!times) return false;

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

function jsonResponse(body: object, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export async function handleAuth(env: Env, request: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";

  if (isAuthRateLimited(ip)) {
    return jsonResponse({ error: "Too many attempts. Try again later." }, 429, corsHeaders);
  }

  try {
    const body = (await request.json()) as AuthRequest;

    if (
      typeof body.token === "string" &&
      body.token.length > 0 &&
      (await timingSafeEqual(body.token, env.ADMIN_PASSWORD))
    ) {
      const sessionToken = await createSessionToken(env.SIGNING_SECRET);
      return jsonResponse({ sessionToken }, 200, corsHeaders);
    }

    recordAuthFailure(ip);
    return jsonResponse({}, 401, corsHeaders);
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400, corsHeaders);
  }
}
