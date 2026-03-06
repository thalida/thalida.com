import { describe, it, expect } from "vitest";
import { pickColor, tileSvg, PLACEHOLDER_COLORS } from "../card-utils";

describe("pickColor", () => {
  it("returns a color from PLACEHOLDER_COLORS", () => {
    const color = pickColor("test");
    expect(PLACEHOLDER_COLORS).toContain(color);
  });

  it("returns consistent results for the same input", () => {
    expect(pickColor("hello")).toBe(pickColor("hello"));
  });

  it("returns different colors for different inputs", () => {
    const colors = new Set(["a", "b", "c", "d", "e", "f"].map(pickColor));
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe("tileSvg", () => {
  it("returns a data URI string", () => {
    const result = tileSvg("Test");
    expect(result).toMatch(/^url\("data:image\/svg\+xml,.+"\)$/);
  });

  it("escapes HTML special characters", () => {
    const result = tileSvg("A&B<C>");
    // The SVG text content should have &amp; &lt; &gt; which get URI-encoded
    const decoded = decodeURIComponent(result);
    expect(decoded).toContain("&amp;");
    expect(decoded).toContain("&lt;");
    expect(decoded).toContain("&gt;");
  });

  it("uppercases the title", () => {
    const decoded = decodeURIComponent(tileSvg("hello"));
    expect(decoded).toContain("HELLO");
  });
});
