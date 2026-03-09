---
title: Idle Blinds Implementation Plan
description: >-
  Lower the LiveWindow blinds when chat goes idle and raise them when the user
  becomes active again. On initial load, use the same `openBlinds()` path.
publishedOn: 2026-03-06T18:47:00.000Z
planType: implementation
topic: idle-blinds
category: live-window
---

# Idle Blinds Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Lower the LiveWindow blinds when chat goes idle and raise them when the user becomes active again. On initial load, use the same `openBlinds()` path.

**Architecture:** Chat dispatches `chat:idle` / `chat:active` custom events on `document`. The homepage script listens and calls `openBlinds()` / `closeBlinds()` on the `<live-window>` element, which delegates to `BlindsComponent`. The existing `animationStarted` flag and `update()`-triggered animation are removed — `startUpdates()` calls `openBlinds()` directly.

**Tech Stack:** TypeScript, Web Components, Astro, Vitest

---

### Task 1: Dispatch idle/active events from chat

**Files:**
- Modify: `app/src/components/Chat/chat-connection.ts:508-520`

**Step 1: Add event dispatches to idle manager callbacks**

In `chat-connection.ts`, inside the `createIdleManager` call (~line 508), add `document.dispatchEvent` calls:

```typescript
state.idleManager = createIdleManager({
  timeoutMs: IDLE_TIMEOUT_MS,
  onIdle() {
    document.dispatchEvent(new CustomEvent("chat:idle"));
    if (state.reconnectTimer) {
      clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
    }
    state.ws?.close();
  },
  onActive() {
    document.dispatchEvent(new CustomEvent("chat:active"));
    connect();
  },
});
```

**Step 2: Run tests to confirm no regressions**

Run: `just app::test`
Expected: All existing chat-idle tests pass (they test the idle manager in isolation, not the connection module).

**Step 3: Commit**

```bash
git add app/src/components/Chat/chat-connection.ts
git commit -m "feat: dispatch chat:idle and chat:active events on document"
```

---

### Task 2: Add openBlinds/closeBlinds to BlindsComponent

**Files:**
- Modify: `app/src/scripts/live-window/components/BlindsComponent.ts`

**Step 1: Refactor BlindsComponent**

Replace the entire `BlindsComponent` with a version that:
- Removes `animationStarted` flag
- Adds `isOpen` boolean to track state
- Cancels in-flight animations when direction changes
- Exposes `openBlinds()` as the public open method (replaces `runAnimation`)
- Exposes `closeBlinds()` as the public close method
- `update()` becomes a no-op for blinds animation (it no longer triggers the open)

```typescript
import type { SceneComponent, LiveWindowState } from "../types";

const NUM_BLINDS = 20;

interface BlindsState {
  numBlindsCollapsed: number;
  blindsOpenDeg: number;
  blindsSkewDeg: number;
  skewDirection: number;
}

type AnimatableProp = keyof BlindsState;

export class BlindsComponent implements SceneComponent {
  private blindsEl: HTMLDivElement | null = null;
  private stringLeftEl: HTMLDivElement | null = null;
  private stringRightEl: HTMLDivElement | null = null;
  private containerEl: HTMLElement | null = null;

  private blindsState: BlindsState = {
    numBlindsCollapsed: 0,
    blindsOpenDeg: 20,
    blindsSkewDeg: 0,
    skewDirection: 0,
  };

  private isOpen = false;
  private animationInterval: number | null = null;
  private animationResolve: (() => void) | null = null;

  mount(container: HTMLElement): void {
    this.containerEl = container;
    container.innerHTML = `
      <div class="blinds" style="--live-window-num-blinds: ${NUM_BLINDS}"></div>
      <div class="blinds-string blinds-string-left"></div>
      <div class="blinds-string blinds-string-right"></div>
    `;

    this.blindsEl = container.querySelector(".blinds");
    this.stringLeftEl = container.querySelector(".blinds-string-left");
    this.stringRightEl = container.querySelector(".blinds-string-right");

    this.renderBlinds();
  }

  update(_state: LiveWindowState): void {
    // Blinds animation is driven by openBlinds/closeBlinds, not the update cycle.
  }

  destroy(): void {
    this.cancelAnimation();
    if (this.containerEl) this.containerEl.innerHTML = "";
    this.containerEl = null;
    this.blindsEl = null;
    this.stringLeftEl = null;
    this.stringRightEl = null;
  }

  openBlinds(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.cancelAnimation();

    this.stepAnimation({ blindsOpenDeg: { targetValue: 75, step: 5 } }, 150).then(() => {
      if (!this.isOpen) return;
      this.stepAnimation({
        blindsOpenDeg: { targetValue: 80, step: 1 },
        numBlindsCollapsed: { targetValue: NUM_BLINDS * 0.7, step: 1 },
        blindsSkewDeg: { targetValue: 5, step: 1 },
        skewDirection: { targetValue: -1, step: 1 },
      });
    });
  }

  closeBlinds(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.cancelAnimation();

    this.stepAnimation(
      {
        numBlindsCollapsed: { targetValue: 0, step: 1 },
        blindsOpenDeg: { targetValue: 20, step: 3 },
        blindsSkewDeg: { targetValue: 0, step: 1 },
        skewDirection: { targetValue: 0, step: 1 },
      },
      80,
    );
  }

  private cancelAnimation(): void {
    if (this.animationInterval != null) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
    if (this.animationResolve) {
      this.animationResolve();
      this.animationResolve = null;
    }
  }

  private renderBlinds(): void {
    if (!this.blindsEl) return;
    const state = this.blindsState;
    const numOpen = NUM_BLINDS - Math.round(state.numBlindsCollapsed);
    const numCollapsed = Math.round(state.numBlindsCollapsed);

    let slats = "";
    for (let i = 0; i < numOpen; i++) {
      slats += `<div class="slat slat-${i + 1}" style="transform:${this.getSkewAndRotateTransform(i)}"></div>`;
    }

    const skew = this.getSkewOnlyTransform();
    slats += `<div class="slat-collapse-group" style="transform:${skew}">`;
    for (let i = 0; i < numCollapsed; i++) {
      slats += '<div class="slat collapse"></div>';
    }
    slats += "</div>";

    slats += `<div class="slat-bar" style="transform:${skew}">`;
    slats += '<span class="string-marker string-marker-left"></span>';
    slats += '<span class="string-marker string-marker-right"></span>';
    slats += "</div>";

    this.blindsEl.innerHTML = `
      <div class="slats">${slats}</div>
      <div class="rod"></div>
    `;

    requestAnimationFrame(() => requestAnimationFrame(() => this.updateStrings()));
  }

  private updateStrings(): void {
    if (!this.containerEl) return;
    const win = this.containerEl.closest(".live-window");
    const ml = this.containerEl.querySelector(".string-marker-left");
    const mr = this.containerEl.querySelector(".string-marker-right");
    if (!win || !ml || !mr) return;

    const winTop = win.getBoundingClientRect().top;
    if (this.stringLeftEl) this.stringLeftEl.style.height = `${ml.getBoundingClientRect().top - winTop}px`;
    if (this.stringRightEl) this.stringRightEl.style.height = `${mr.getBoundingClientRect().top - winTop}px`;
  }

  private stepAnimation(
    targets: Partial<Record<AnimatableProp, { targetValue: number; step: number }>>,
    speedMs = 100,
  ): Promise<void> {
    const remaining = new Map(Object.entries(targets) as [string, { targetValue: number; step: number }][]);
    return new Promise<void>((resolve) => {
      this.animationResolve = resolve;
      this.animationInterval = window.setInterval(() => {
        const size = remaining.size;
        let finished = 0;

        for (const [prop, anim] of remaining) {
          const key = prop as AnimatableProp;
          const cur = this.blindsState[key];
          const dir = cur < anim.targetValue ? 1 : -1;
          const next = cur + anim.step * dir;
          this.blindsState[key] = next;

          const reached = dir === -1 ? next <= anim.targetValue : next >= anim.targetValue;
          if (reached) {
            this.blindsState[key] = anim.targetValue;
            finished++;
            remaining.delete(prop);
          }
        }

        this.renderBlinds();

        if (finished >= size) {
          if (this.animationInterval != null) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
          }
          this.animationResolve = null;
          resolve();
        }
      }, speedMs);
    });
  }

  private getSkewAndRotateTransform(blindIndex: number): string {
    const state = this.blindsState;
    const currBlind = NUM_BLINDS - blindIndex;
    const numOpen = NUM_BLINDS - state.numBlindsCollapsed;
    const skewSteps = numOpen > 0 ? state.blindsSkewDeg / numOpen : 0;

    let skewDeg = 0;
    if (state.skewDirection !== 0 && state.blindsSkewDeg >= 0) {
      skewDeg = state.blindsSkewDeg - (currBlind - state.numBlindsCollapsed - 1) * skewSteps;
    }

    const rot = state.blindsOpenDeg;
    return `rotateX(${rot}deg) skewY(${skewDeg * state.skewDirection}deg)`;
  }

  private getSkewOnlyTransform(): string {
    const state = this.blindsState;
    let skewDeg = 0;
    if (state.skewDirection !== 0 && state.blindsSkewDeg >= 0) {
      skewDeg = state.blindsSkewDeg / 2;
    }
    return `skewY(${skewDeg * state.skewDirection}deg)`;
  }
}
```

Key changes from the original:
- **Removed** `animationStarted` flag
- **Added** `isOpen` boolean — prevents redundant open/close calls
- **Added** `animationResolve` — tracks the current animation promise so `cancelAnimation()` can resolve it
- **Added** `cancelAnimation()` — clears interval and resolves pending promise (prevents chained `.then()` from firing after cancel)
- **`openBlinds()`** — guards on `isOpen`, cancels any in-flight animation, runs the two-step open sequence
- **`closeBlinds()`** — guards on `!isOpen`, cancels any in-flight animation, runs a single simultaneous step to lower all slats
- **`update()`** — now a no-op (animation is driven externally)
- **`stepAnimation`** — snaps to `targetValue` on reach (prevents overshoot)

**Step 2: Run typecheck**

Run: `just app::typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/components/BlindsComponent.ts
git commit -m "feat: add openBlinds/closeBlinds to BlindsComponent, remove auto-open on update"
```

---

### Task 3: Expose openBlinds/closeBlinds on LiveWindowElement

**Files:**
- Modify: `app/src/scripts/live-window/LiveWindow.ts`

**Step 1: Add public methods and call openBlinds in startUpdates**

Add two public methods to `LiveWindowElement` that delegate to `blindsComponent`, and replace the generic `updateAll()` at startup with a call to `openBlinds()`:

In the class body, after `updateAll()` (~line 227), add:

```typescript
openBlinds(): void {
  this.blindsComponent.openBlinds();
}

closeBlinds(): void {
  this.blindsComponent.closeBlinds();
}
```

In `startUpdates()` (~line 188), change it to call `openBlinds()` after the initial `updateAll()`:

```typescript
private startUpdates() {
  this.refreshAttrs();
  this.updateAll();
  this.openBlinds();

  this.clockInterval = window.setInterval(() => this.updateClock(), 1000);
  this.skyInterval = window.setInterval(() => this.updateAll(), 15 * 60 * 1000);

  if (this.getAttribute("api-url")) {
    this.startWeatherPolling();
  }
}
```

**Step 2: Run typecheck**

Run: `just app::typecheck`
Expected: No type errors

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/LiveWindow.ts
git commit -m "feat: expose openBlinds/closeBlinds on LiveWindowElement"
```

---

### Task 4: Wire chat idle events to LiveWindow on homepage

**Files:**
- Modify: `app/src/pages/index.astro:126-141`

**Step 1: Add event listeners in the homepage script**

In the `astro:page-load` handler in `index.astro`, after the existing `live-window:clock-update` listener (~line 134), add listeners for `chat:idle` and `chat:active`. Cast the element to access the public methods:

```typescript
document.addEventListener("astro:page-load", () => {
  homeAC?.abort();
  homeAC = new AbortController();
  const { signal } = homeAC;

  updateGreeting();
  const lw = document.querySelector("live-window") as (HTMLElement & { openBlinds(): void; closeBlinds(): void }) | null;
  if (lw) {
    lw.addEventListener("live-window:clock-update", updateGreeting, { signal });
    document.addEventListener("chat:idle", () => lw.closeBlinds(), { signal });
    document.addEventListener("chat:active", () => lw.openBlinds(), { signal });
  }

  const timeline = document.querySelector(".home-timeline");
  if (timeline) {
    updateTimelineShadows();
    timeline.addEventListener("scroll", updateTimelineShadows, { passive: true, signal });
  }
});
```

**Step 2: Run typecheck and tests**

Run: `just app::typecheck && just app::test`
Expected: All pass

**Step 3: Commit**

```bash
git add app/src/pages/index.astro
git commit -m "feat: wire chat idle/active events to LiveWindow blinds"
```

---

### Task 5: Manual verification

**Step 1: Start dev server**

Run: `just app::serve`

**Step 2: Verify initial load**

- Open homepage in browser
- Confirm blinds animate open as before (slats rotate, then collapse upward)

**Step 3: Verify idle → close**

- Switch to a different browser tab
- Wait 5+ minutes (or temporarily lower `IDLE_TIMEOUT_MS` to 5000 in `chat-connection.ts` for faster testing)
- Switch back and confirm blinds re-open

**Step 4: Revert any temporary timeout change**

If `IDLE_TIMEOUT_MS` was changed for testing, revert it back to `5 * 60 * 1000`.

**Step 5: Run full test suite**

Run: `just test`
Expected: All tests pass

**Step 6: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: cleanup after idle blinds verification"
```
