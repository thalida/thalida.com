import { describe, it, expect } from "vitest";
import { parseContentPath } from "../content-path";

describe("parseContentPath", () => {
  it("returns slug only for single-segment ID", () => {
    expect(parseContentPath("advent-of-code")).toEqual({
      slug: "advent-of-code",
    });
  });

  it("returns category + slug for two-segment ID", () => {
    expect(parseContentPath("education/advent-of-code")).toEqual({
      category: "education",
      slug: "advent-of-code",
    });
  });

  it("returns category + subcategory + slug for three-segment ID", () => {
    expect(parseContentPath("craft/3dprint/homer-bathroom")).toEqual({
      category: "craft",
      subcategory: "3dprint",
      slug: "homer-bathroom",
    });
  });

  it("handles deeply nested slugs (4+ segments) by joining remainder as slug", () => {
    expect(parseContentPath("craft/3dprint/sub/deep-post")).toEqual({
      category: "craft",
      subcategory: "3dprint",
      slug: "sub/deep-post",
    });
  });
});
