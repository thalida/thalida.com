import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("Worker routing", () => {
  // ── Key Flows ────────────────────────────────────────────────────

  describe("key flows", () => {
    it("GET / returns 200 health check", async () => {
      const resp = await SELF.fetch("https://fake-host/");
      expect(resp.status).toBe(200);
      expect(await resp.json()).toEqual({});
    });

    // WebSocket upgrade (GET /ws -> 101) is tested extensively in
    // chat-room.test.ts via the connectAndJoin/openWs helpers.

    it("POST /auth with correct token returns 200 with empty body", async () => {
      const resp = await SELF.fetch("https://fake-host/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "test-admin-secret" }),
      });
      expect(resp.status).toBe(200);
      const body = await resp.json();
      expect(body).toEqual({});
    });

    it("OPTIONS preflight returns 204 with CORS headers", async () => {
      const resp = await SELF.fetch("https://fake-host/auth", {
        method: "OPTIONS",
        headers: { Origin: "https://thalida.com" },
      });
      expect(resp.status).toBe(204);
      expect(resp.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    });
  });

  // ── Security Concerns ────────────────────────────────────────────

  describe("security concerns", () => {
    it("POST /auth with wrong token returns 401", async () => {
      const resp = await SELF.fetch("https://fake-host/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "wrong-secret" }),
      });
      expect(resp.status).toBe(401);
      const body = await resp.json();
      expect(body).toEqual({});
    });

    it("POST /auth with malformed JSON returns 400", async () => {
      const resp = await SELF.fetch("https://fake-host/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json {{{",
      });
      expect(resp.status).toBe(400);
    });

    it("POST /auth with missing body returns 400", async () => {
      const resp = await SELF.fetch("https://fake-host/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      expect(resp.status).toBe(400);
    });

    it("CORS allows legitimate localhost origin", async () => {
      const resp = await SELF.fetch("https://fake-host/", {
        headers: { Origin: "http://localhost:4321" },
      });
      expect(resp.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:4321");
    });

    it("CORS allows the configured ALLOWED_ORIGIN", async () => {
      const resp = await SELF.fetch("https://fake-host/", {
        headers: { Origin: "https://thalida.com" },
      });
      expect(resp.headers.get("Access-Control-Allow-Origin")).toBe("https://thalida.com");
    });

    it("CORS rejects non-matching origin", async () => {
      const resp = await SELF.fetch("https://fake-host/", {
        headers: { Origin: "https://evil-site.com" },
      });
      const allowed = resp.headers.get("Access-Control-Allow-Origin");
      expect(allowed === "" || allowed === null).toBe(true);
    });

    it("CORS rejects localhost.evil.com", async () => {
      const resp = await SELF.fetch("https://fake-host/", {
        headers: { Origin: "http://localhost.evil.com" },
      });
      const allowed = resp.headers.get("Access-Control-Allow-Origin");
      expect(allowed === "" || allowed === null).toBe(true);
    });
  });

  // ── Location Endpoint ──────────────────────────────────────────

  describe("GET /location", () => {
    it("returns 503 when IPREGISTRY_KEY is not configured", async () => {
      const resp = await SELF.fetch("https://fake-host/location");
      expect(resp.status).toBe(503);
      const body = (await resp.json()) as { error: string };
      expect(body.error).toBe("Location service not configured");
    });

    it("includes CORS headers", async () => {
      const resp = await SELF.fetch("https://fake-host/location", {
        headers: { Origin: "https://thalida.com" },
      });
      expect(resp.headers.get("Access-Control-Allow-Origin")).toBe("https://thalida.com");
    });
  });

  // ── Weather Endpoint ────────────────────────────────────────────

  describe("GET /weather", () => {
    it("returns 503 when OPENWEATHER_KEY is not configured", async () => {
      const resp = await SELF.fetch("https://fake-host/weather?lat=40&lon=-74");
      expect(resp.status).toBe(503);
      const body = (await resp.json()) as { error: string };
      expect(body.error).toBe("Weather service not configured");
    });

    it("includes CORS headers", async () => {
      const resp = await SELF.fetch("https://fake-host/weather?lat=40&lon=-74", {
        headers: { Origin: "https://thalida.com" },
      });
      expect(resp.headers.get("Access-Control-Allow-Origin")).toBe("https://thalida.com");
    });
  });

  // ── Failure States ───────────────────────────────────────────────

  describe("failure states", () => {
    it("GET /ws without upgrade header returns 426", async () => {
      const resp = await SELF.fetch("https://fake-host/ws");
      expect(resp.status).toBe(426);
    });

    it("GET /unknown-path returns 404", async () => {
      const resp = await SELF.fetch("https://fake-host/unknown-path");
      expect(resp.status).toBe(404);
    });
  });
});
