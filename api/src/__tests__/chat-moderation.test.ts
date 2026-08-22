import { http, HttpResponse } from "msw";
import { describe, it, expect } from "vitest";
import { callModerationAPI } from "../chat-moderation";
import { network } from "./server";

const MODERATIONS_URL = "https://api.openai.com/v1/moderations";

describe("callModerationAPI", () => {
  it("returns flagged result when content is flagged", async () => {
    network.use(
      http.post(
        MODERATIONS_URL,
        () => HttpResponse.json({ results: [{ flagged: true, categories: { hate: true, violence: false } }] }),
        { once: true },
      ),
    );

    const result = await callModerationAPI("test-key", "offensive text");
    expect(result).toMatchObject({
      flagged: true,
      categories: { hate: true },
    });
  });

  it("returns not-flagged result for safe content", async () => {
    network.use(
      http.post(MODERATIONS_URL, () => HttpResponse.json({ results: [{ flagged: false, categories: {} }] }), {
        once: true,
      }),
    );

    const result = await callModerationAPI("test-key", "hello world");
    expect(result).toMatchObject({ flagged: false });
  });

  it("returns null on non-429 error (e.g. 500)", async () => {
    network.use(
      http.post(MODERATIONS_URL, () => new HttpResponse("Internal Server Error", { status: 500 }), { once: true }),
    );

    const result = await callModerationAPI("test-key", "test", 1);
    expect(result).toBeNull();
  });

  it("retries on 429 and succeeds", async () => {
    // Handlers are matched in order, and `once` retires each after one hit:
    // first call gets the 429, the retry gets the success.
    network.use(
      http.post(MODERATIONS_URL, () => new HttpResponse("", { status: 429, headers: { "retry-after": "0" } }), {
        once: true,
      }),
      http.post(MODERATIONS_URL, () => HttpResponse.json({ results: [{ flagged: false, categories: {} }] }), {
        once: true,
      }),
    );

    const result = await callModerationAPI("test-key", "test", 2);
    expect(result).toMatchObject({ flagged: false });
  });

  it("returns null after exhausting retries on 429", async () => {
    // Persistent handler: every attempt gets a 429.
    network.use(
      http.post(MODERATIONS_URL, () => new HttpResponse("", { status: 429, headers: { "retry-after": "0" } })),
    );

    const result = await callModerationAPI("test-key", "test", 2);
    expect(result).toBeNull();
  });

  it("returns null when results array is empty", async () => {
    network.use(http.post(MODERATIONS_URL, () => HttpResponse.json({ results: [] }), { once: true }));

    const result = await callModerationAPI("test-key", "test");
    expect(result).toBeNull();
  });
});
