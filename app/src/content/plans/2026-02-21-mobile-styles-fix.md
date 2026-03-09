---
title: Mobile Styles Fix Implementation Plan
description: >-
  Fix five mobile layout bugs: the ~48px gap between toolbar and nav drawer,
  content pushed rightward, iOS viewport height, missing body scroll lock, and
  unresponsive about-page grid.
publishedOn: 2026-02-21T07:14:27.000Z
planType: implementation
topic: mobile-styles
category: styling
---

# Mobile Styles Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix five mobile layout bugs: the ~48px gap between toolbar and nav drawer, content pushed rightward, iOS viewport height, missing body scroll lock, and unresponsive about-page grid.

**Architecture:** Five targeted surgical edits across four files plus one new CSS file. No refactoring. Each fix is independent and can be verified in isolation.

**Tech Stack:** Astro 5, vanilla CSS, TypeScript (browser), Vitest for unit tests (CSS changes are visual-only — no new unit tests needed; run existing tests to confirm nothing broken).

---

### Task 1: Fix `position` conflict in ProjectTree.css

**Root cause:** `#site-nav { position: relative }` in `ProjectTree.css` loads after BaseLayout.css in Astro's bundle. With Astro 5's `:where()` scoping, they have equal specificity — so the later `position: relative` overrides the mobile `position: fixed`. Result: drawer is in normal flow, shifted 48px too far down, and still occupies flex space.

**Files:**
- Modify: `app/src/components/ProjectTree/ProjectTree.css:1-8`

**Step 1: Make the change**

In `ProjectTree.css`, wrap `position: relative` in a desktop-only media query so it never fires on mobile:

```css
/* ---- Layout ---- */
#site-nav {
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}

@media (min-width: 640px) {
  #site-nav {
    position: relative;
  }
}
```

**Step 2: Run existing tests to confirm nothing broken**

```bash
just app::test
```
Expected: all tests pass (CSS changes don't affect unit tests).

**Step 3: Commit**

```bash
git add app/src/components/ProjectTree/ProjectTree.css
git commit -m "fix: scope position:relative to desktop to fix mobile drawer gap"
```

---

### Task 2: Fix `height: 100vh` for iOS Safari

**Root cause:** On iOS Safari, `100vh` equals the full viewport including the browser chrome (address bar). This makes `#layout` taller than the visible area, causing overflow and incorrect drawer heights.

**Fix:** Use `100svh` (small viewport height — the stable visible area). Add `100vh` before it as a fallback for browsers that don't support `svh` units yet.

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.css:10`

**Step 1: Make the change**

In `BaseLayout.css`, update the `#layout` rule:

```css
#layout {
  display: flex;
  height: 100vh;        /* fallback */
  height: 100svh;       /* iOS Safari: stable viewport height */
  width: 100vw;
}
```

**Step 2: Confirm tests pass**

```bash
just app::test
```
Expected: all tests pass.

**Step 3: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.css
git commit -m "fix: use 100svh for stable mobile viewport height"
```

---

### Task 3: Add body scroll lock when a drawer is open

**Root cause:** When a drawer slides in, content behind it can still be scrolled. The `BaseLayout.ts` drawer logic adds/removes `.open` but never locks the body.

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.ts:10-14`

**Step 1: Update `closeAll` and the open handlers in BaseLayout.ts**

Locate the `closeAll` function and the two `addEventListener` click handlers. Update them so that opening a drawer sets `document.body.style.overflow = 'hidden'` and `closeAll` restores it to `''`:

```typescript
function closeAll() {
  siteNav.classList.remove("open");
  chatPanel.classList.remove("open");
  backdrop.classList.remove("visible");
  document.body.style.overflow = "";
}

menuBtn.addEventListener("click", () => {
  const willOpen = !siteNav.classList.contains("open");
  closeAll();
  if (willOpen) {
    siteNav.classList.add("open");
    backdrop.classList.add("visible");
    document.body.style.overflow = "hidden";
  }
});

chatBtn.addEventListener("click", () => {
  const willOpen = !chatPanel.classList.contains("open");
  closeAll();
  if (willOpen) {
    chatPanel.classList.add("open");
    backdrop.classList.add("visible");
    document.body.style.overflow = "hidden";
  }
});
```

**Step 2: Confirm tests pass**

```bash
just app::test
```
Expected: all tests pass.

**Step 3: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.ts
git commit -m "fix: lock body scroll when mobile drawer is open"
```

---

### Task 4: Fix about-page photo grid on mobile

**Root cause:** `about.astro` has `grid-template-columns: repeat(4, 1fr)` as an inline style. On small screens (< 640px), this squishes four photos into very narrow columns.

**Fix:** Add a `<style>` block in `about.astro` that targets the grid div and overrides to 2 columns on mobile.

**Files:**
- Modify: `app/src/pages/about.astro`

**Step 1: Add a named class to the grid div and a `<style>` block**

In `about.astro`, replace the grid div's inline style with a class, and add a scoped `<style>` block at the bottom of the file:

```astro
<div class="about-photos">
  <Image src={meMemoji} alt="A Memoji of Thalida" style="width:100%;height:auto;border-radius:1rem;" />
  <Image src={meHeadshot} alt="A headshot of Thalida" style="width:100%;height:auto;border-radius:1rem;" />
  <Image src={meAvatar} alt="A cartoon avatar of Thalida" style="width:100%;height:auto;border-radius:1rem;" />
  <Image
    src={meRainbow}
    alt="A rainbow themed image of Thalida"
    style="width:100%;height:auto;border-radius:1rem;"
  />
</div>
```

And add at the bottom of `about.astro`:

```astro
<style>
  .about-photos {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  @media (max-width: 639px) {
    .about-photos {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
```

**Step 2: Confirm tests pass**

```bash
just app::test
```
Expected: all tests pass.

**Step 3: Commit**

```bash
git add app/src/pages/about.astro
git commit -m "fix: responsive 2-column photo grid on mobile about page"
```

---

### Task 5: Add basic styles for Chat panel

**Root cause:** `Chat.astro` has no associated CSS file. The chat panel slides in on mobile but its internal content (heading, inputs, messages) has no styling — inherits browser defaults only.

**Files:**
- Create: `app/src/components/Chat/Chat.css`
- Modify: `app/src/components/Chat/Chat.astro` (add `<style>` import)

**Step 1: Create Chat.css**

```css
#chat-panel {
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

#chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 0.25em;
}

#chat-header h2 {
  margin: 0;
  font-size: 1.1em;
  letter-spacing: 0.02em;
}

#chat-admin-link {
  font-size: 0.8em;
  color: #999;
  text-decoration: none;
}

#chat-admin-link:hover {
  color: #333;
}

#chat-owner-status,
#chat-user-count {
  font-size: 0.8em;
  color: #666;
}

#chat-room {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  flex: 1;
}

#chat-messages {
  flex: 1;
  font-size: 0.85em;
}

#chat-username-bar {
  display: flex;
  flex-direction: column;
  gap: 0.25em;
  font-size: 0.8em;
  color: #666;
}

#chat-username-bar label {
  font-size: inherit;
}

#chat-username {
  width: 100%;
  padding: 0.3em 0.5em;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: inherit;
  font-family: inherit;
}

#chat-rename-btn {
  padding: 0.3em 0.6em;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fff;
  font-size: inherit;
  cursor: pointer;
}

#chat-input {
  width: 100%;
  padding: 0.4em 0.6em;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.85em;
  font-family: inherit;
  box-sizing: border-box;
}

#chat-send {
  width: 100%;
  padding: 0.4em;
  margin-top: 0.25em;
  border: none;
  border-radius: 6px;
  background: #4338ca;
  color: #fff;
  font-size: 0.85em;
  cursor: pointer;
  font-family: inherit;
}

#chat-send:hover {
  background: #3730a3;
}
```

**Step 2: Import Chat.css in Chat.astro**

Add at the bottom of `Chat.astro`:

```astro
<style>
  @import "./Chat.css";
</style>
```

**Step 3: Confirm tests pass**

```bash
just app::test
```
Expected: all tests pass.

**Step 4: Commit**

```bash
git add app/src/components/Chat/Chat.css app/src/components/Chat/Chat.astro
git commit -m "feat: add basic styles for chat panel"
```

---

## Final Verification

After all tasks are complete:

```bash
just app::test
```

Expected: all tests pass. Then do a manual visual check on mobile (browser devtools responsive mode at 375px width):
- [ ] Nav drawer slides in flush against toolbar bottom edge (no gap)
- [ ] Content viewer fills full width (not shifted right)
- [ ] Backdrop prevents body scroll when drawer open
- [ ] About page shows 2-column photo grid
- [ ] Chat panel has readable styled content
