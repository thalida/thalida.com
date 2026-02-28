/**
 * Remark plugin that extracts structured recipe data from markdown AST.
 *
 * Only runs on files inside `src/content/recipes/`. For each recipe it finds:
 *   - `## Ingredients` → flattens nested lists into a flat array of strings
 *   - `## Directions` / `## Steps` / `## Instructions` → extracts steps,
 *     with optional `###` sub-headings mapped to HowToSection groups
 *
 * The extracted data is exported via `file.data.astro.frontmatter.recipeData`
 * so the page template can access it through Astro's `remarkPluginFrontmatter`.
 */

const INGREDIENT_HEADINGS = new Set(["ingredients"]);
const DIRECTION_HEADINGS = new Set(["directions", "steps", "instructions"]);

/** Recursively extract plain text from an mdast node. */
function nodeText(node) {
  if (!node) return "";
  if (node.type === "text" || node.type === "inlineCode") return node.value ?? "";
  if (node.children) return node.children.map(nodeText).join("");
  return "";
}

/**
 * Flatten a nested ingredient list.
 * Items with a sub-list are treated as category labels (e.g. "Breading") and
 * skipped — only the leaf items (actual ingredients) are included.
 */
function flattenIngredients(listNode) {
  const result = [];
  for (const item of listNode.children) {
    const nestedList = item.children.find((c) => c.type === "list");
    if (nestedList) {
      result.push(...flattenIngredients(nestedList));
    } else {
      const text = nodeText(item).replace(/\n+/g, " ").trim();
      if (text) result.push(text);
    }
  }
  return result;
}

/**
 * Extract top-level step text from a list node.
 * Sub-lists (notes, tips) nested inside a step are ignored.
 */
function extractSteps(listNode) {
  const result = [];
  for (const item of listNode.children) {
    const paragraphs = item.children.filter((c) => c.type === "paragraph");
    const text = paragraphs
      .map((p) => nodeText(p).replace(/\n+/g, " ").trim())
      .join(" ")
      .trim();
    if (text) result.push(text);
  }
  return result;
}

/**
 * Walk siblings after the directions heading and extract instruction sections.
 *
 * - `### Sub-heading` → starts a new named section (HowToSection)
 * - Ordered/unordered list → steps belonging to the current section
 * - Next `##` heading → stop
 *
 * Returns an array of { name: string | null, steps: string[] }.
 * If there are no `###` headings, the result is a single unnamed section.
 */
function extractInstructionSections(nodes, startIdx) {
  const sections = [];
  let current = { name: null, steps: [] };

  for (let i = startIdx + 1; i < nodes.length; i++) {
    const n = nodes[i];

    // Stop at next h2 or higher
    if (n.type === "heading" && n.depth <= 2) break;

    // h3 = new named section
    if (n.type === "heading" && n.depth === 3) {
      if (current.steps.length > 0) sections.push(current);
      current = { name: nodeText(n).trim(), steps: [] };
      continue;
    }

    // Any list = steps for the current section
    if (n.type === "list") {
      current.steps.push(...extractSteps(n));
    }
  }

  if (current.steps.length > 0) sections.push(current);

  return sections;
}

export default function remarkExtractRecipe() {
  return (tree, file) => {
    const filePath = file.history?.[0] ?? file.path ?? "";
    if (!filePath.includes("/content/recipes/")) return;

    const nodes = tree.children;
    let ingredientsIdx = -1;
    let directionsIdx = -1;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.type === "heading" && n.depth === 2) {
        const text = nodeText(n).toLowerCase();
        if (INGREDIENT_HEADINGS.has(text)) ingredientsIdx = i;
        else if (DIRECTION_HEADINGS.has(text)) directionsIdx = i;
      }
    }

    const ingredients =
      ingredientsIdx !== -1 && nodes[ingredientsIdx + 1]?.type === "list"
        ? flattenIngredients(nodes[ingredientsIdx + 1])
        : [];

    const instructionSections = directionsIdx !== -1 ? extractInstructionSections(nodes, directionsIdx) : [];

    file.data.astro ??= {};
    file.data.astro.frontmatter ??= {};
    file.data.astro.frontmatter.recipeData = { ingredients, instructionSections };
  };
}
