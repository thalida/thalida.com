// @vitest-environment node
import { describe, it, expect } from "vitest";
import remarkExtractRecipe from "../remark-extract-recipe.mjs";

function makeHeading(depth, text) {
  return { type: "heading", depth, children: [{ type: "text", value: text }] };
}

function makeList(ordered, items) {
  return {
    type: "list",
    ordered,
    children: items.map((text) =>
      typeof text === "string"
        ? { type: "listItem", children: [{ type: "paragraph", children: [{ type: "text", value: text }] }] }
        : text,
    ),
  };
}

function makeNestedListItem(label, subItems) {
  return {
    type: "listItem",
    children: [{ type: "paragraph", children: [{ type: "text", value: label }] }, makeList(false, subItems)],
  };
}

function runPlugin(tree, filePath = "/src/content/recipes/test.md") {
  const file = { history: [filePath], data: {} };
  const plugin = remarkExtractRecipe();
  plugin(tree, file);
  return file.data.astro?.frontmatter?.recipeData;
}

describe("remarkExtractRecipe", () => {
  it("skips non-recipe files", () => {
    const tree = { children: [makeHeading(2, "Ingredients"), makeList(false, ["1 cup flour"])] };
    const result = runPlugin(tree, "/src/content/guides/test.md");
    expect(result).toBeUndefined();
  });

  it("extracts flat ingredients list", () => {
    const tree = {
      children: [makeHeading(2, "Ingredients"), makeList(false, ["1 cup flour", "2 eggs", "1 tsp salt"])],
    };
    const result = runPlugin(tree);
    expect(result.ingredients).toEqual(["1 cup flour", "2 eggs", "1 tsp salt"]);
  });

  it("flattens nested ingredient lists (category labels skipped)", () => {
    const tree = {
      children: [
        makeHeading(2, "Ingredients"),
        makeList(false, [makeNestedListItem("Breading", ["1 cup breadcrumbs", "1 egg"])]),
      ],
    };
    const result = runPlugin(tree);
    expect(result.ingredients).toEqual(["1 cup breadcrumbs", "1 egg"]);
  });

  it("extracts simple directions", () => {
    const tree = {
      children: [makeHeading(2, "Directions"), makeList(true, ["Preheat oven to 350\u00B0F", "Mix dry ingredients"])],
    };
    const result = runPlugin(tree);
    expect(result.instructionSections).toEqual([
      { name: null, steps: ["Preheat oven to 350\u00B0F", "Mix dry ingredients"] },
    ]);
  });

  it("recognizes alternative heading names", () => {
    for (const heading of ["Steps", "Instructions"]) {
      const tree = {
        children: [makeHeading(2, heading), makeList(true, ["Do the thing"])],
      };
      const result = runPlugin(tree);
      expect(result.instructionSections[0].steps).toEqual(["Do the thing"]);
    }
  });

  it("splits directions by h3 sub-headings into named sections", () => {
    const tree = {
      children: [
        makeHeading(2, "Directions"),
        makeHeading(3, "Prep"),
        makeList(true, ["Dice onions"]),
        makeHeading(3, "Cook"),
        makeList(true, ["Saute onions"]),
      ],
    };
    const result = runPlugin(tree);
    expect(result.instructionSections).toEqual([
      { name: "Prep", steps: ["Dice onions"] },
      { name: "Cook", steps: ["Saute onions"] },
    ]);
  });

  it("returns empty arrays when sections are missing", () => {
    const tree = {
      children: [makeHeading(2, "Notes"), { type: "paragraph", children: [{ type: "text", value: "Just a note" }] }],
    };
    const result = runPlugin(tree);
    expect(result.ingredients).toEqual([]);
    expect(result.instructionSections).toEqual([]);
  });
});
