import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getFaviconUrl } from "../link-metadata";

describe("getFaviconUrl", () => {
  it("returns Google favicon service URL for valid URLs", () => {
    const result = getFaviconUrl("https://example.com/page");
    expect(result).toBe("https://www.google.com/s2/favicons?domain=example.com&sz=32");
  });

  it("extracts hostname without path", () => {
    const result = getFaviconUrl("https://docs.example.com/a/b/c");
    expect(result).toBe("https://www.google.com/s2/favicons?domain=docs.example.com&sz=32");
  });

  it("returns empty string for invalid URLs", () => {
    expect(getFaviconUrl("not-a-url")).toBe("");
  });
});

describe("link-metadata", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-07T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("fetchMetadata dead detection", () => {
    it("marks a link as dead: false when fetch succeeds with 200", async () => {
      const { getLinkMetadataMap } = await import("../link-metadata");
      const mockFs = await import("node:fs");
      vi.spyOn(mockFs.promises, "readFile").mockRejectedValue(new Error("no cache"));
      vi.spyOn(mockFs.promises, "mkdir").mockResolvedValue(undefined);
      vi.spyOn(mockFs.promises, "writeFile").mockResolvedValue(undefined);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: async () => "<html><title>Test</title></html>",
        }),
      );

      const result = await getLinkMetadataMap(["https://example.com"]);
      expect(result["https://example.com"].dead).toBe(false);
    });

    it("marks a link as dead: true when fetch returns 404", async () => {
      const { getLinkMetadataMap } = await import("../link-metadata");
      const mockFs = await import("node:fs");
      vi.spyOn(mockFs.promises, "readFile").mockRejectedValue(new Error("no cache"));
      vi.spyOn(mockFs.promises, "mkdir").mockResolvedValue(undefined);
      vi.spyOn(mockFs.promises, "writeFile").mockResolvedValue(undefined);

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

      const result = await getLinkMetadataMap(["https://dead.example.com"]);
      expect(result["https://dead.example.com"].dead).toBe(true);
    });

    it("marks a link as dead: true when fetch throws (network error)", async () => {
      const { getLinkMetadataMap } = await import("../link-metadata");
      const mockFs = await import("node:fs");
      vi.spyOn(mockFs.promises, "readFile").mockRejectedValue(new Error("no cache"));
      vi.spyOn(mockFs.promises, "mkdir").mockResolvedValue(undefined);
      vi.spyOn(mockFs.promises, "writeFile").mockResolvedValue(undefined);

      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

      const result = await getLinkMetadataMap(["https://unreachable.example.com"]);
      expect(result["https://unreachable.example.com"].dead).toBe(true);
    });
  });
});
