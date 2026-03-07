import { describe, it, expect } from "vitest";
import {
  relativeLuminance,
  contrastRatio,
  getReadableColor,
  parseHexColor,
  parseComputedColor,
  rgbToHex,
  lerpColor,
  lerpHex,
} from "../utils/color";

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
    expect(parseHexColor("zzzzzz")).toBeNull();
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

describe("rgbToHex", () => {
  it("converts RGB to hex string", () => {
    expect(rgbToHex({ r: 255, g: 128, b: 0 })).toBe("#ff8000");
  });

  it("pads single-digit channels with leading zero", () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
    expect(rgbToHex({ r: 1, g: 2, b: 3 })).toBe("#010203");
  });
});

describe("lerpColor", () => {
  it("returns first color at t=0", () => {
    expect(lerpColor({ r: 0, g: 0, b: 0 }, { r: 100, g: 200, b: 50 }, 0)).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("returns second color at t=1", () => {
    expect(lerpColor({ r: 0, g: 0, b: 0 }, { r: 100, g: 200, b: 50 }, 1)).toEqual({ r: 100, g: 200, b: 50 });
  });

  it("returns midpoint at t=0.5", () => {
    expect(lerpColor({ r: 0, g: 0, b: 0 }, { r: 100, g: 200, b: 50 }, 0.5)).toEqual({ r: 50, g: 100, b: 25 });
  });
});

describe("lerpHex", () => {
  it("interpolates two hex colors", () => {
    expect(lerpHex("#000000", "#ff8000", 0.5)).toBe("#804000");
  });

  it("returns first color at t=0", () => {
    expect(lerpHex("#ff0000", "#0000ff", 0)).toBe("#ff0000");
  });

  it("returns second color at t=1", () => {
    expect(lerpHex("#ff0000", "#0000ff", 1)).toBe("#0000ff");
  });

  it("returns first color for invalid hex input", () => {
    expect(lerpHex("#ff0000", "invalid", 0.5)).toBe("#ff0000");
  });
});
