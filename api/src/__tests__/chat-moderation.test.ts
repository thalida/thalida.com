import { fetchMock } from "cloudflare:test";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { callModerationAPI } from "../chat-moderation";

describe("callModerationAPI", () => {
  beforeAll(() => {
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterAll(() => {
    fetchMock.deactivate();
  });

  it("returns flagged result when content is flagged", async () => {
    fetchMock
      .get("https://api.openai.com")
      .intercept({ path: "/v1/moderations", method: "POST" })
      .reply(200, {
        results: [{ flagged: true, categories: { hate: true, violence: false } }],
      });

    const result = await callModerationAPI("test-key", "offensive text");
    expect(result).toMatchObject({
      flagged: true,
      categories: { hate: true },
    });
  });

  it("returns not-flagged result for safe content", async () => {
    fetchMock
      .get("https://api.openai.com")
      .intercept({ path: "/v1/moderations", method: "POST" })
      .reply(200, {
        results: [{ flagged: false, categories: {} }],
      });

    const result = await callModerationAPI("test-key", "hello world");
    expect(result).toMatchObject({ flagged: false });
  });

  it("returns null on non-429 error (e.g. 500)", async () => {
    fetchMock
      .get("https://api.openai.com")
      .intercept({ path: "/v1/moderations", method: "POST" })
      .reply(500, "Internal Server Error");

    const result = await callModerationAPI("test-key", "test", 1);
    expect(result).toBeNull();
  });

  it("retries on 429 and succeeds", async () => {
    // First call: 429
    fetchMock
      .get("https://api.openai.com")
      .intercept({ path: "/v1/moderations", method: "POST" })
      .reply(429, "", { headers: { "retry-after": "0" } });

    // Second call: success
    fetchMock
      .get("https://api.openai.com")
      .intercept({ path: "/v1/moderations", method: "POST" })
      .reply(200, {
        results: [{ flagged: false, categories: {} }],
      });

    const result = await callModerationAPI("test-key", "test", 2);
    expect(result).toMatchObject({ flagged: false });
  });

  it("returns null after exhausting retries on 429", async () => {
    // All calls return 429
    fetchMock
      .get("https://api.openai.com")
      .intercept({ path: "/v1/moderations", method: "POST" })
      .reply(429, "", { headers: { "retry-after": "0" } })
      .times(2);

    const result = await callModerationAPI("test-key", "test", 2);
    expect(result).toBeNull();
  });

  it("returns null when results array is empty", async () => {
    fetchMock
      .get("https://api.openai.com")
      .intercept({ path: "/v1/moderations", method: "POST" })
      .reply(200, { results: [] });

    const result = await callModerationAPI("test-key", "test");
    expect(result).toBeNull();
  });
});
