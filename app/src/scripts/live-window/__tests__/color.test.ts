import { describe, it, expect } from "vitest";
import { relativeLuminance, contrastRatio, getReadableColor, parseHexColor, parseComputedColor } from "../color";

describe("parseHexColor", () => {
  it("parses 6-digit hex with #", () => {
    expect(parseHexColor("#030a12")).toEqual({ r: 3, g: 10, b: 18 });
  });

  it("parses 6-digit hex without #", () => {
    expect(parseHexColor("ff8000")).toEqual({ r: 255, g: 128, b: 0 });
  });

  it("returns null for invalid hex", () => {
    expect(parseHexColor("abc")).toBeNull();
    expect(parseHexColor("")).toBeNull();
  });
});

describe("parseComputedColor", () => {
  it("parses rgb() string", () => {
    expect(parseComputedColor("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30 });
  });

  it("returns null for non-matching string", () => {
    expect(parseComputedColor("transparent")).toBeNull();
  });
});

describe("relativeLuminance", () => {
  it("returns 0 for black", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
  });

  it("returns 1 for white", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 4);
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    expect(contrastRatio(black, white)).toBeCloseTo(21, 0);
  });

  it("returns 1 for same color", () => {
    const c = { r: 128, g: 128, b: 128 };
    expect(contrastRatio(c, c)).toBeCloseTo(1, 4);
  });
});

describe("getReadableColor", () => {
  it("returns original color when contrast is already sufficient", () => {
    const white = { r: 255, g: 255, b: 255 };
    const black = { r: 0, g: 0, b: 0 };
    expect(getReadableColor(white, black)).toEqual(white);
  });

  it("boosts lightness for low-contrast colors on dark background", () => {
    const darkBlue = { r: 10, g: 15, b: 40 };
    const darkBg = { r: 3, g: 10, b: 18 };
    const result = getReadableColor(darkBlue, darkBg);
    // Result should have higher contrast than original
    expect(contrastRatio(result, darkBg)).toBeGreaterThanOrEqual(4.5);
  });
});
