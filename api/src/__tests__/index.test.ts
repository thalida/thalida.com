import { SELF } from "cloudflare:test";
import { http, HttpResponse } from "msw";
import { describe, it, expect } from "vitest";
import { handleWeather, handleLocation } from "../proxy";
import type { Env } from "../types";
import { network } from "./server";

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

    it("POST /auth with correct token returns 200 with sessionToken", async () => {
      const resp = await SELF.fetch("https://fake-host/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "test-admin-password" }),
      });
      expect(resp.status).toBe(200);
      const body = (await resp.json()) as { sessionToken?: string };
      expect(body.sessionToken).toBeDefined();
      expect(typeof body.sessionToken).toBe("string");
      expect(body.sessionToken?.includes(".")).toBe(true);
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

    it("rejects WebSocket upgrade with no Origin header", async () => {
      const resp = await SELF.fetch("https://fake-host/ws", {
        headers: { Upgrade: "websocket" },
      });
      expect(resp.status).toBe(403);
      expect(await resp.text()).toBe("Forbidden origin");
    });

    it("WebSocket upgrade rejects disallowed Origin", async () => {
      const resp = await SELF.fetch("https://fake-host/ws", {
        headers: {
          Upgrade: "websocket",
          Origin: "https://evil-site.com",
        },
      });
      expect(resp.status).toBe(403);
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

  // ── Weather Input Validation (TEST-API-6) ────────────────────────

  describe("weather input validation (direct handler)", () => {
    const env = { OPENWEATHER_KEY: "test-key", ALLOWED_ORIGIN: "https://thalida.com" } as Env;
    const headers = {} as Record<string, string>;

    it("returns 400 when lat/lon are missing", async () => {
      const resp = await handleWeather(env, new Request("https://fake/weather"), headers);
      expect(resp.status).toBe(400);
      const body = (await resp.json()) as { error: string };
      expect(body.error).toBe("lat and lon query params required");
    });

    it("returns 400 for lat out of range", async () => {
      const resp = await handleWeather(env, new Request("https://fake/weather?lat=999&lon=0"), headers);
      expect(resp.status).toBe(400);
      const body = (await resp.json()) as { error: string };
      expect(body.error).toContain("lat must be -90..90");
    });

    it("returns 400 for lon out of range", async () => {
      const resp = await handleWeather(env, new Request("https://fake/weather?lat=0&lon=999"), headers);
      expect(resp.status).toBe(400);
    });

    it("returns 400 for non-numeric lat/lon", async () => {
      const resp = await handleWeather(env, new Request("https://fake/weather?lat=abc&lon=0"), headers);
      expect(resp.status).toBe(400);
    });

    it("returns 400 for invalid units", async () => {
      const resp = await handleWeather(env, new Request("https://fake/weather?lat=40&lon=-74&units=kelvin"), headers);
      expect(resp.status).toBe(400);
      const body = (await resp.json()) as { error: string };
      expect(body.error).toContain("units must be one of");
    });
  });

  // ── Location/Weather Success Paths (TEST-API-2) ──────────────────

  describe("location/weather success paths (direct handler)", () => {
    const env = {
      OPENWEATHER_KEY: "test-weather-key",
      IPREGISTRY_KEY: "test-ipregistry-key",
      ALLOWED_ORIGIN: "https://thalida.com",
    } as Env;
    const headers = {} as Record<string, string>;

    it("weather returns parsed data on success", async () => {
      network.use(
        http.get("https://api.openweathermap.org/data/2.5/weather", () =>
          HttpResponse.json({
            weather: [{ id: 800, main: "Clear", description: "clear sky", icon: "01d" }],
            main: { temp: 22.5 },
            sys: { sunrise: 1700000000, sunset: 1700040000 },
          }),
        ),
      );

      const resp = await handleWeather(env, new Request("https://fake/weather?lat=40&lon=-74"), headers);
      expect(resp.status).toBe(200);
      const body = (await resp.json()) as Record<string, unknown>;
      expect(body).toMatchObject({
        id: 800,
        main: "Clear",
        description: "clear sky",
        icon: "01d",
        temp: 22.5,
        sunrise: 1700000000,
        sunset: 1700040000,
      });
    });

    it("weather returns 502 on upstream error", async () => {
      network.use(
        http.get(
          "https://api.openweathermap.org/data/2.5/weather",
          () => new HttpResponse("Internal Error", { status: 500 }),
        ),
      );

      const resp = await handleWeather(env, new Request("https://fake/weather?lat=40&lon=-74"), headers);
      expect(resp.status).toBe(502);
    });

    it("location returns parsed data on success", async () => {
      network.use(
        http.get("https://api.ipregistry.co/*", () =>
          HttpResponse.json({
            location: { latitude: 40.71, longitude: -74.01, country: { code: "US" }, city: "New York" },
            time_zone: { id: "America/New_York" },
          }),
        ),
      );

      const req = new Request("https://fake/location", {
        headers: { "CF-Connecting-IP": "8.8.8.8" },
      });
      const resp = await handleLocation(env, req, headers);
      expect(resp.status).toBe(200);
      const body = (await resp.json()) as Record<string, unknown>;
      expect(body).toMatchObject({
        lat: 40.71,
        lng: -74.01,
        country: "US",
        name: "New York",
        timezone: "America/New_York",
      });
    });

    it("location returns 502 on upstream error", async () => {
      network.use(http.get("https://api.ipregistry.co/*", () => new HttpResponse("Internal Error", { status: 500 })));

      const req = new Request("https://fake/location", {
        headers: { "CF-Connecting-IP": "8.8.8.8" },
      });
      const resp = await handleLocation(env, req, headers);
      expect(resp.status).toBe(502);
    });

    it("location uses empty IP for private addresses", async () => {
      network.use(
        http.get("https://api.ipregistry.co/*", () =>
          HttpResponse.json({
            location: { latitude: 0, longitude: 0, country: { code: "XX" }, city: "Unknown" },
            time_zone: { id: "UTC" },
          }),
        ),
      );

      const req = new Request("https://fake/location", {
        headers: { "CF-Connecting-IP": "192.168.1.1" },
      });
      const resp = await handleLocation(env, req, headers);
      expect(resp.status).toBe(200);
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

    it("returns CORS headers on 404", async () => {
      const resp = await SELF.fetch("https://fake-host/nonexistent", {
        headers: { Origin: "https://thalida.com" },
      });
      expect(resp.status).toBe(404);
      expect(resp.headers.get("Access-Control-Allow-Origin")).toBe("https://thalida.com");
    });
  });
});
