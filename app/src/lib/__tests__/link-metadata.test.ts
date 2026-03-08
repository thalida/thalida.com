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

  describe("revalidation (toRevalidate)", () => {
    it("re-fetches and updates a cached entry older than 7 days", async () => {
      const { getLinkMetadataMap } = await import("../link-metadata");
      const mockFs = await import("node:fs");

      const now = new Date("2026-03-07T12:00:00Z").getTime();
      const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000;

      const staleCache = {
        "https://stale.example.com": {
          metaTitle: "Old Title",
          metaDescription: "Old description",
          faviconUrl: "https://www.google.com/s2/favicons?domain=stale.example.com&sz=32",
          dead: false,
          fetchedAt: eightDaysAgo,
        },
      };

      vi.spyOn(mockFs.promises, "readFile").mockResolvedValue(JSON.stringify(staleCache));
      vi.spyOn(mockFs.promises, "mkdir").mockResolvedValue(undefined);
      vi.spyOn(mockFs.promises, "writeFile").mockResolvedValue(undefined);

      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("favicons")) {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({
          ok: true,
          text: async () => "<html><title>New Title</title></html>",
        });
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await getLinkMetadataMap(["https://stale.example.com"]);

      expect(result["https://stale.example.com"].metaTitle).toBe("New Title");
      expect(result["https://stale.example.com"].dead).toBe(false);
      expect(result["https://stale.example.com"].fetchedAt).toBe(now);

      // Verify fetch was actually called (page fetch + favicon fetch)
      const pageFetchCalls = fetchMock.mock.calls.filter((call) => call[0] === "https://stale.example.com");
      expect(pageFetchCalls.length).toBe(1);
    });

    it("re-validates a cached entry missing the dead field (legacy cache)", async () => {
      const { getLinkMetadataMap } = await import("../link-metadata");
      const mockFs = await import("node:fs");

      const now = new Date("2026-03-07T12:00:00Z").getTime();
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;

      // Legacy cache entry: has fetchedAt within 7 days but no dead field
      const legacyCache = {
        "https://legacy.example.com": {
          metaTitle: "Legacy Title",
          faviconUrl: "https://www.google.com/s2/favicons?domain=legacy.example.com&sz=32",
          fetchedAt: oneDayAgo,
        },
      };

      vi.spyOn(mockFs.promises, "readFile").mockResolvedValue(JSON.stringify(legacyCache));
      vi.spyOn(mockFs.promises, "mkdir").mockResolvedValue(undefined);
      vi.spyOn(mockFs.promises, "writeFile").mockResolvedValue(undefined);

      const fetchMock = vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.includes("favicons")) {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await getLinkMetadataMap(["https://legacy.example.com"]);

      expect(result["https://legacy.example.com"].dead).toBe(true);
      expect(result["https://legacy.example.com"].fetchedAt).toBe(now);
    });

    it("serves a cached entry within 7 days without making a network call", async () => {
      const { getLinkMetadataMap } = await import("../link-metadata");
      const mockFs = await import("node:fs");

      const now = new Date("2026-03-07T12:00:00Z").getTime();
      const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;

      const freshCache = {
        "https://fresh.example.com": {
          metaTitle: "Cached Title",
          metaDescription: "Cached description",
          faviconUrl: "https://www.google.com/s2/favicons?domain=fresh.example.com&sz=32",
          dead: false,
          fetchedAt: oneDayAgo,
        },
      };

      vi.spyOn(mockFs.promises, "readFile").mockResolvedValue(JSON.stringify(freshCache));
      vi.spyOn(mockFs.promises, "mkdir").mockResolvedValue(undefined);
      vi.spyOn(mockFs.promises, "writeFile").mockResolvedValue(undefined);

      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const result = await getLinkMetadataMap(["https://fresh.example.com"]);

      expect(result["https://fresh.example.com"].metaTitle).toBe("Cached Title");
      expect(result["https://fresh.example.com"].dead).toBe(false);
      expect(result["https://fresh.example.com"].fetchedAt).toBe(oneDayAgo);

      // Verify fetch was NOT called at all
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
