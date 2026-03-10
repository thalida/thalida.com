---
title: Site Footer Implementation Plan
description: Add a minimal sitewide footer inside the center content area
  showing "created by thalida" and the last git commit date.
publishedOn: 2026-03-08T23:48:44.000Z
tags:
  - implementation
---

# Site Footer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a minimal sitewide footer inside the center content area showing "created by thalida" and the last git commit date.

**Architecture:** New `Footer.astro` component that reads the latest git commit date at build time via `execSync`. Placed inside the center content `<div>` in `BaseLayout.astro`, after the `<slot />`. A new `formatDateFull` helper in `format-utils.ts` formats the date as "Mon DD, YYYY".

**Tech Stack:** Astro, TypeScript, Tailwind CSS, Node `child_process`

---

### Task 1: Add `formatDateFull` helper

**Files:**
- Modify: `app/src/lib/format-utils.ts`
- Modify: `app/src/lib/__tests__/format-utils.test.ts`

**Step 1: Write the failing test**

Add to `app/src/lib/__tests__/format-utils.test.ts`:

```typescript
describe("formatDateFull", () => {
  it("formats date as full month day and year", () => {
    const result = formatDateFull("2024-06-15T00:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });
});
```

Update the import to include `formatDateFull`.

**Step 2: Run test to verify it fails**

Run: `just app::test -- --run app/src/lib/__tests__/format-utils.test.ts`
Expected: FAIL — `formatDateFull` is not exported

**Step 3: Write minimal implementation**

Add to `app/src/lib/format-utils.ts`:

```typescript
export function formatDateFull(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
```

**Step 4: Run test to verify it passes**

Run: `just app::test -- --run app/src/lib/__tests__/format-utils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add app/src/lib/format-utils.ts app/src/lib/__tests__/format-utils.test.ts
git commit -m "feat: add formatDateFull helper for footer date display"
```

---

### Task 2: Create Footer component

**Files:**
- Create: `app/src/components/Footer/Footer.astro`

**Step 1: Create the component**

```astro
---
import { execSync } from "node:child_process";
import { formatDateFull } from "@lib/format-utils";

let lastUpdated: string;
try {
  const commitDate = execSync("git log -1 --format=%cI", { encoding: "utf-8" }).trim();
  lastUpdated = formatDateFull(commitDate);
} catch {
  lastUpdated = formatDateFull(new Date().toISOString());
}
---

<footer class="mt-auto pt-4 pb-2 border-t border-border text-center">
  <p class="font-body text-xs text-muted">
    created by thalida · last updated {lastUpdated}
  </p>
</footer>
```

**Step 2: Commit**

```bash
git add app/src/components/Footer/Footer.astro
git commit -m "feat: add Footer component with git commit date"
```

---

### Task 3: Add Footer to BaseLayout

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.astro`

**Step 1: Import Footer and add after slot**

Add import at top of frontmatter:
```typescript
import Footer from "@components/Footer/Footer.astro";
```

Replace the content div (lines 133-137) to include Footer after the slot:
```astro
<div
  class="grow shrink basis-0 min-w-0 pt-16 pb-4 px-4 sm:px-6 sm:pb-6 xl:pt-6 xl:pb-6 overflow-y-auto overflow-x-hidden flex flex-col"
>
  <div class="grow">
    <slot />
  </div>
  <Footer />
</div>
```

Note: The content div needs `flex flex-col` added, and the slot is wrapped in a `grow` div so the footer pushes to the bottom when content is short.

**Step 2: Verify locally**

Run: `just app::serve`
Check: Footer appears at the bottom of the center content area on multiple pages. Sidebars do not have the footer.

**Step 3: Run build and tests**

Run: `just app::build`
Expected: Build succeeds, no errors

Run: `just app::test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.astro
git commit -m "feat: add footer to BaseLayout center content area"
```

---

### Task 4: Update TODO.md

**Files:**
- Modify: `TODO.md`

**Step 1: Mark the footer task as complete**

Change `- [ ] add site footer` to `- [x] add site footer`

**Step 2: Commit**

```bash
git add TODO.md
git commit -m "docs: mark site footer task as complete"
```
