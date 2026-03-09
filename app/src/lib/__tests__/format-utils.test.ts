import { describe, it, expect } from "vitest";
import { isValidDate, formatDate, formatDateFull, categoryDisplay } from "../format-utils";

describe("isValidDate", () => {
  it("returns true for valid ISO date strings", () => {
    expect(isValidDate("2024-01-15T00:00:00Z")).toBe(true);
  });

  it("returns false for invalid date strings", () => {
    expect(isValidDate("not-a-date")).toBe(false);
  });

  it("returns false for dates before 1970", () => {
    expect(isValidDate("1969-12-31T00:00:00Z")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidDate("")).toBe(false);
  });
});

describe("formatDate", () => {
  it("formats date as short month and year", () => {
    const result = formatDate("2024-06-15T00:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("2024");
  });
});

describe("formatDateFull", () => {
  it("formats date as full month day, year, and time", () => {
    const result = formatDateFull("2024-06-15T14:30:00Z");
    expect(result).toContain("June");
    expect(result).toContain("15");
    expect(result).toContain("2024");
    expect(result).toMatch(/2:30/);
    expect(result).toContain("UTC");
  });
});

describe("categoryDisplay", () => {
  it("capitalizes single word", () => {
    expect(categoryDisplay("design")).toBe("Design");
  });

  it("capitalizes hyphenated words", () => {
    expect(categoryDisplay("web-development")).toBe("Web Development");
  });

  it("keeps 'and' lowercase", () => {
    expect(categoryDisplay("arts-and-crafts")).toBe("Arts and Crafts");
  });

  it("handles single character category", () => {
    expect(categoryDisplay("a")).toBe("A");
  });
});
