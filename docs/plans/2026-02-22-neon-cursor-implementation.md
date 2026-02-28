# Neon Glow Cursor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a custom neon glow cursor with a soft fading trail across the entire site.

**Architecture:** A single Astro component (`NeonCursor`) renders a CSS-styled cursor dot and a canvas overlay for the trail. Client-side TypeScript handles mouse tracking, interactive element detection, and the canvas animation loop. Touch devices get the default browser cursor.

**Tech Stack:** Astro, TypeScript, Canvas API, CSS custom properties (uses existing design tokens)

---

### Task 1: Create the NeonCursor Astro component with cursor dot and canvas markup

**Files:**
- Create: `app/src/components/NeonCursor/NeonCursor.astro`

**Step 1: Create the component file**

```astro
---
---

<div id="neon-cursor" aria-hidden="true"></div>
<canvas id="neon-cursor-trail" aria-hidden="true"></canvas>
<script src="./NeonCursor.ts"></script>
```

**Step 2: Commit**

```bash
git add app/src/components/NeonCursor/NeonCursor.astro
git commit -m "feat: add NeonCursor component markup"
```

---

### Task 2: Create the NeonCursor TypeScript with mouse tracking and glow dot

**Files:**
- Create: `app/src/components/NeonCursor/NeonCursor.ts`

**Step 1: Write the cursor initialization and mouse tracking**

```typescript
const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, [role="button"], .cursor-pointer, [class*="cursor-pointer"]';

const NEON = "#39ff14";
const TEAL = "#00e5a0";
const DOT_SIZE = 8;
const DOT_SIZE_HOVER = 12;

function initNeonCursor() {
  // Bail on touch devices
  if (window.matchMedia("(pointer: coarse)").matches) return;

  const dot = document.getElementById("neon-cursor");
  const canvas = document.getElementById("neon-cursor-trail") as HTMLCanvasElement | null;
  if (!dot || !canvas) return;

  // Style the dot
  Object.assign(dot.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: `${DOT_SIZE}px`,
    height: `${DOT_SIZE}px`,
    borderRadius: "50%",
    background: NEON,
    boxShadow: `0 0 4px ${NEON}, 0 0 12px ${NEON}, 0 0 24px ${NEON}80`,
    pointerEvents: "none",
    zIndex: "9999",
    transition: "width 0.15s, height 0.15s, background 0.15s, box-shadow 0.15s",
    transform: "translate(-50%, -50%)",
    opacity: "0",
  });

  // Style the canvas
  Object.assign(canvas.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "9998",
  });

  // Set canvas resolution
  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) return;

  // Add class to hide default cursor
  document.documentElement.classList.add("has-custom-cursor");

  let mouseX = 0;
  let mouseY = 0;
  let isHovering = false;
  let isVisible = false;

  // Track mouse position
  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isVisible) {
      isVisible = true;
      dot.style.opacity = "1";
    }
  });

  // Hide when mouse leaves window
  document.addEventListener("mouseleave", () => {
    isVisible = false;
    dot.style.opacity = "0";
  });

  document.addEventListener("mouseenter", () => {
    isVisible = true;
    dot.style.opacity = "1";
  });

  // Detect interactive elements via event delegation
  document.addEventListener("mouseover", (e) => {
    const target = e.target as Element;
    if (target.closest(INTERACTIVE_SELECTOR)) {
      isHovering = true;
      const size = `${DOT_SIZE_HOVER}px`;
      dot.style.width = size;
      dot.style.height = size;
      dot.style.background = TEAL;
      dot.style.boxShadow = `0 0 4px ${TEAL}, 0 0 12px ${TEAL}, 0 0 24px ${TEAL}80`;
    }
  });

  document.addEventListener("mouseout", (e) => {
    const target = e.target as Element;
    if (target.closest(INTERACTIVE_SELECTOR)) {
      isHovering = false;
      const size = `${DOT_SIZE}px`;
      dot.style.width = size;
      dot.style.height = size;
      dot.style.background = NEON;
      dot.style.boxShadow = `0 0 4px ${NEON}, 0 0 12px ${NEON}, 0 0 24px ${NEON}80`;
    }
  });

  // Animation loop
  function animate() {
    // Position the dot
    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;

    // Fade existing trail
    if (ctx) {
      ctx.fillStyle = "rgba(3, 10, 18, 0.15)";
      ctx.fillRect(0, 0, canvas!.width, canvas!.height);

      // Draw glow at current position
      if (isVisible) {
        const color = isHovering ? TEAL : NEON;
        const gradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 16);
        gradient.addColorStop(0, color + "40");
        gradient.addColorStop(1, color + "00");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 16, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// Initialize on page load (supports Astro client-side navigation)
document.addEventListener("astro:page-load", initNeonCursor);
```

**Step 2: Commit**

```bash
git add app/src/components/NeonCursor/NeonCursor.ts
git commit -m "feat: add NeonCursor client-side logic with trail canvas"
```

---

### Task 3: Add CSS to hide the default cursor

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.css`

**Step 1: Add cursor-hiding rules after the `::selection` block (around line 55)**

After the existing `::selection` rule, add:

```css
/* ---- Custom cursor (neon glow) ---- */

html.has-custom-cursor,
html.has-custom-cursor * {
  cursor: none !important;
}
```

**Step 2: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.css
git commit -m "style: hide default cursor when custom neon cursor is active"
```

---

### Task 4: Wire NeonCursor into BaseLayout

**Files:**
- Modify: `app/src/layouts/BaseLayout/BaseLayout.astro`

**Step 1: Import the NeonCursor component**

Add to the frontmatter imports (after existing imports):

```astro
import NeonCursor from "@components/NeonCursor/NeonCursor.astro";
```

**Step 2: Render the component before closing `</body>`**

Add `<NeonCursor />` just before `<script src="./BaseLayout.ts"></script>`:

```astro
    <NeonCursor />
    <script src="./BaseLayout.ts"></script>
  </body>
```

**Step 3: Commit**

```bash
git add app/src/layouts/BaseLayout/BaseLayout.astro
git commit -m "feat: render NeonCursor in BaseLayout"
```

---

### Task 5: Visual verification

**Step 1: Start the dev server**

Run: `just app::serve`

**Step 2: Verify in browser**

- [ ] Neon green glowing dot follows the mouse smoothly
- [ ] Soft green trail fades behind cursor movement
- [ ] Hovering links/buttons: dot turns teal and grows slightly
- [ ] Moving off interactive elements: dot returns to neon green and original size
- [ ] Default browser cursor is hidden everywhere
- [ ] Cursor dot disappears when mouse leaves the window
- [ ] Navigating between pages (client-side): cursor still works
- [ ] Resize browser: canvas adjusts to new viewport size

**Step 3: Verify touch device behavior**

Open Chrome DevTools → toggle device toolbar (Ctrl+Shift+M) → select a mobile device:
- [ ] No custom cursor elements visible
- [ ] Default browser cursor behavior is preserved
- [ ] No `has-custom-cursor` class on `<html>`

**Step 4: Final commit if any tweaks were needed**

```bash
git add -A
git commit -m "fix: neon cursor visual tweaks from testing"
```

---

### Task 6: Build verification

**Step 1: Run the build**

Run: `just app::build`
Expected: Build succeeds with no errors.

**Step 2: Commit if needed**

Only if build revealed issues that needed fixing.
