import { describe, it, expect } from "vitest";
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
