---
title: Weather Visual Fixes Implementation Plan
description: "Fix 6 visual bugs in the live-window weather effects: tornado rain
  intensity, atmosphere particle appearance, atmosphere layer positioning,
  cloud/rain animation stuttering, tilted rain loop stutter, and cloud
  left-bias."
publishedOn: 2026-03-07T05:41:41.000Z
tags:
  - implementation
---

# Weather Visual Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 6 visual bugs in the live-window weather effects: tornado rain intensity, atmosphere particle appearance, atmosphere layer positioning, cloud/rain animation stuttering, tilted rain loop stutter, and cloud left-bias.

**Architecture:** All changes are in two files: `WeatherLayer.ts` (config + HTML generation) and `live-window.css` (keyframes + styling). The approach is: extend the `AtmosphereParticleConfig` type with new visual fields, update rendering to use them, fix CSS animations, fix the cloud distribution hash, and add re-render caching to prevent animation restarts.

**Tech Stack:** TypeScript, CSS keyframes, Vitest

---

### Task 1: Reduce tornado rain intensity

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts:452`

**Step 1: Update the tornado config**

Change weather ID 781 from `p("extremeRain")` to `p("heavyRain")`:

```typescript
781: fx("storm", [p("heavyRain")], {
  atmosphere: ATMOSPHERE_CONFIG.tornado,
  wind: "strong",
  atmosphereParticles: ATMO_PARTICLE_CONFIG.debrisSwirl,
}),
```

**Step 2: Run tests**

Run: `just app::test`
Expected: All 348 tests pass (no tests assert tornado uses extremeRain specifically).

**Step 3: Commit**

```
feat(weather): reduce tornado rain from extreme to heavy
```

---

### Task 2: Add new fields to AtmosphereParticleConfig

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts:193-204`

**Step 1: Extend the AtmosphereParticleConfig interface**

Add three optional fields with defaults:

```typescript
export interface AtmosphereParticleConfig {
  count: number;
  color: string;
  /** Size range [min, max] in px */
  sizeRange: [number, number];
  /** Opacity range [min, max] as 0-100 integers */
  opacityRange: [number, number];
  /** CSS animation duration for particle motion */
  speed: string;
  /** Motion type: float = horizontal drift, swirl = circular, fall = downward, rise = upward */
  drift: "float" | "swirl" | "fall" | "rise";
  /** Width/height ratio. >1 = horizontal elongation, <1 = vertical. Default 1. */
  aspectRatio?: number;
  /** Blur radius in px. Default 4. */
  blur?: number;
  /** CSS border-radius. Default "50%". */
  borderRadius?: string;
}
```

**Step 2: Run tests**

Run: `just app::test`
Expected: All tests pass (fields are optional, no breaking change).

**Step 3: Commit**

```
feat(weather): add aspectRatio, blur, borderRadius to AtmosphereParticleConfig
```

---

### Task 3: Update atmosphere particle configs with unique visuals

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts:222-287`
- Modify: `app/src/scripts/live-window/__tests__/layers/weather.test.ts:315`

**Step 1: Update the test for valid drift values to include "rise"**

In the test `"each config has required fields"` for ATMO_PARTICLE_CONFIG, update:

```typescript
expect(["float", "swirl", "fall", "rise"]).toContain(config.drift);
```

**Step 2: Run the test — confirm it passes (no "rise" configs yet, but the assertion is broader)**

Run: `just app::test`
Expected: PASS

**Step 3: Update mistWisps config — thin horizontal wisps**

```typescript
mistWisps: {
  count: 6,
  color: "#d0d0d0",
  sizeRange: [40, 80],
  opacityRange: [8, 20],
  speed: "16s",
  drift: "float",
  aspectRatio: 4,
  blur: 30,
},
```

**Step 4: Update fogBanks config — huge diffuse blobs that merge**

```typescript
fogBanks: {
  count: 4,
  color: "#c0c0c0",
  sizeRange: [100, 160],
  opacityRange: [20, 40],
  speed: "22s",
  drift: "float",
  aspectRatio: 1.3,
  blur: 50,
},
```

**Step 5: Update smokeWisps config — rising billowing puffs**

```typescript
smokeWisps: {
  count: 10,
  color: "#7a6548",
  sizeRange: [35, 65],
  opacityRange: [15, 35],
  speed: "11s",
  drift: "rise",
  aspectRatio: 0.8,
  blur: 25,
},
```

**Step 6: Run tests**

Run: `just app::test`
Expected: All tests pass. The `smokeWisps` test on line 506 checks for `.atmo-float` but smoke now uses `drift: "rise"`. Check — that test (`"renders atmosphere with correct color for smoke (711)"`) checks:
- `.atmosphere-lg` style contains `#8b7355` (still true, atmosphere layer config unchanged)
- `.atmo-float` exists (WILL FAIL — smoke now uses `drift: "rise"` → class `atmo-rise`)

**Step 7: Fix the smoke test**

Update line 506 in the test file from:
```typescript
expect(container.querySelector(".atmo-float")).toBeTruthy();
```
to:
```typescript
expect(container.querySelector(".atmo-rise")).toBeTruthy();
```

**Step 8: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 9: Commit**

```
feat(weather): differentiate mist, fog, smoke atmosphere particles
```

---

### Task 4: Update atmosphereParticleHTML to use new config fields

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts:665-682`

**Step 1: Write a test for the new fields being rendered**

Add to the `WeatherLayer.atmosphereParticleHTML` describe block in the test file:

```typescript
it("renders blur and aspect ratio from config", () => {
  const html = WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.mistWisps);
  // mistWisps has aspectRatio: 4, blur: 30
  expect(html).toContain("filter:blur(30px)");
  // Height should differ from width (aspect ratio applied)
  // For a particle with e.g. width 40px, height = 40/4 = 10px
  expect(html).not.toMatch(/width:(\d+)px;height:\1px/);
});

it("renders rise drift class for smoke", () => {
  const html = WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.smokeWisps);
  expect(html).toContain("atmo-rise");
});

it("uses default blur when not specified", () => {
  const html = WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.dustSwirl);
  expect(html).toContain("filter:blur(4px)");
});
```

**Step 2: Run tests — confirm new tests fail**

Run: `just app::test`
Expected: FAIL — `atmosphereParticleHTML` doesn't output `filter:blur(...)` or use aspect ratio yet.

**Step 3: Update atmosphereParticleHTML to use new fields**

Replace the method body (lines 665-682):

```typescript
static atmosphereParticleHTML(config: AtmosphereParticleConfig): string {
  const sRange = config.sizeRange[1] - config.sizeRange[0];
  const opRange = config.opacityRange[1] - config.opacityRange[0];
  const ar = config.aspectRatio ?? 1;
  const blur = config.blur ?? 4;
  const radius = config.borderRadius ?? "50%";

  let out = "";
  for (let i = 0; i < config.count; i++) {
    const h = ((i + 1) * 2654435761) >>> 0;
    const left = h % 100;
    const top = ((h >>> 8) ^ (i * 37)) % 80;
    const size = config.sizeRange[0] + (h % (sRange + 1));
    const opacity = (config.opacityRange[0] + ((h >>> 4) % (opRange + 1))) / 100;
    const dur = parseFloat(config.speed) + ((h >>> 12) % 30) / 10;
    const delay = -((h >>> 16) % 80) / 10;

    const w = ar >= 1 ? size : Math.round(size * ar);
    const ht = ar >= 1 ? Math.round(size / ar) : size;

    out += `<div class="atmo-particle atmo-${config.drift}" style="left:${left}%;top:${top}%;width:${w}px;height:${ht}px;opacity:${opacity};background:${config.color};border-radius:${radius};filter:blur(${blur}px);animation-duration:${dur.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s"></div>`;
  }
  return out;
}
```

Key changes:
- `aspectRatio` controls width/height relationship: if >=1, width = size, height = size/ar. If <1, height = size, width = size*ar.
- `blur` is applied inline via `filter:blur(Npx)` instead of relying on CSS class.
- `borderRadius` is applied inline.

**Step 4: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 5: Commit**

```
feat(weather): render atmosphere particles with per-config blur, aspect ratio, border-radius
```

---

### Task 5: Add atmo-rise CSS keyframe and remove hardcoded blur from .atmo-particle

**Files:**
- Modify: `app/src/scripts/live-window/live-window.css:484-505`

**Step 1: Remove hardcoded `filter: blur(4px)` from .atmo-particle base class**

The `.atmo-particle` rule at line 484 currently has `filter: blur(4px)`. Remove it since blur is now inline per-particle. Also remove `filter: blur(1px)` from `.atmo-swirl` at line 499.

```css
.atmo-particle {
  position: absolute;
  border-radius: 50%;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}
```

Note: Keep `border-radius: 50%` as a default fallback — inline `border-radius` from the config will override it.

**Step 2: Add atmo-rise class and keyframe**

After the `.atmo-fall` rule (line 502), add:

```css
.atmo-rise {
  animation-name: atmo-rise;
  animation-timing-function: linear;
}

@keyframes atmo-rise {
  0% {
    transform: translate(3px, 20%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-3px, -30%) scale(1.1);
    opacity: 0.3;
  }
}
```

Smoke rises, drifts slightly sideways, expands, and fades out.

**Step 3: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 4: Commit**

```
feat(weather): add atmo-rise keyframe for smoke, remove hardcoded blur from atmo-particle
```

---

### Task 6: Fix atmosphere layer positioning and animation

**Files:**
- Modify: `app/src/scripts/live-window/live-window.css:450-480`

**Step 1: Fix the atmosphere-layer CSS**

Replace the `.atmosphere-layer` rule and `atmosphere-roll` keyframe:

```css
.weather .atmosphere-layer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  filter: blur(12px);
  border-radius: 40% 40% 0 0;
  animation: 6s ease-in-out infinite alternate atmosphere-pulse;
  transform-origin: center bottom;
}

@keyframes atmosphere-pulse {
  0% {
    transform: scale(1);
    opacity: var(--atmo-opacity);
  }
  100% {
    transform: scale(1.05);
    opacity: calc(var(--atmo-opacity) * 0.9);
  }
}
```

Key changes:
- `width: 100%` instead of `120%` — no horizontal overflow
- `transform-origin: center bottom` — scaling grows upward from the base
- `atmosphere-pulse` replaces `atmosphere-roll` — subtle scale + opacity breathing
- Uses CSS variable `--atmo-opacity` so the pulse can reference the inline opacity

**Step 2: Update WeatherLayer.ts atmosphere HTML generation to set the CSS variable**

In `WeatherLayer.ts` line 746, change the atmosphere layer HTML to use the CSS variable:

```typescript
html += `<div class="atmosphere-layer atmosphere-${size}" style="background:linear-gradient(to top, ${color}, transparent);--atmo-opacity:${opacity};opacity:${opacity}"></div>`;
```

**Step 3: Run tests**

Run: `just app::test`
Expected: All tests pass (tests check for `.atmosphere-lg` existence and style containing color, both still true).

**Step 4: Commit**

```
fix(weather): atmosphere layer covers full width, uses subtle pulse instead of horizontal roll
```

---

### Task 7: Fix cloud distribution bias

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts:600-632`

**Step 1: Write a test for cloud distribution**

Add to the `WeatherLayer.cloudHTML` describe block:

```typescript
it("distributes clouds across full width range", () => {
  const html = WeatherLayer.cloudHTML("storm");
  const leftValues = [...html.matchAll(/left:([\d.-]+)%/g)].map((m) => parseFloat(m[1]));
  // With 9 storm clouds, at least one should be past 70%
  expect(leftValues.some((l) => l > 70)).toBe(true);
  // And at least one in the first third
  expect(leftValues.some((l) => l < 35)).toBe(true);
});
```

**Step 2: Run tests — confirm new test fails**

Run: `just app::test`
Expected: FAIL — current hash puts most clouds under 60%.

**Step 3: Fix cloud horizontal distribution using golden ratio**

In `cloudHTML`, replace the `left` calculation (line 610):

```typescript
const left = ((i * 0.618033 + 0.3) % 1) * 110 - 5;
```

Keep the existing hash `h` for everything else (size, opacity, animation duration/delay). Only use golden ratio for horizontal placement.

**Step 4: Run tests**

Run: `just app::test`
Expected: All tests pass including the new distribution test.

**Step 5: Commit**

```
fix(weather): use golden-ratio spacing for even cloud distribution
```

---

### Task 8: Fix tilted rain loop stutter — use skewX

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts:756-773`
- Modify: `app/src/scripts/live-window/live-window.css:248-273`
- Modify: `app/src/scripts/live-window/__tests__/layers/weather.test.ts:543-553`

**Step 1: Update tests for the new wind approach**

The two tests that check `animationName` for wind variants need to change. Wind is now a `skewX` transform on the container, not a different animation name:

Replace the test `"renders wind-driven precipitation for shower rain (521)"`:

```typescript
it("renders wind-driven precipitation for shower rain (521)", () => {
  layer.update(makeState(521));
  const droplets = container.querySelector(".droplets") as HTMLElement;
  expect(droplets.style.animationName).toBe("precipitate");
  expect(droplets.style.transform).toContain("skewX");
});
```

Replace the test `"renders strong wind for squalls (771)"`:

```typescript
it("renders strong wind for squalls (771)", () => {
  layer.update(makeState(771));
  const droplets = container.querySelector(".droplets") as HTMLElement;
  expect(droplets.style.animationName).toBe("precipitate");
  expect(droplets.style.transform).toContain("skewX");
});
```

**Step 2: Run tests — confirm updated tests fail**

Run: `just app::test`
Expected: FAIL — still using old wind animation names.

**Step 3: Remove wind-variant keyframes from CSS**

Delete these keyframes from `live-window.css` (lines 248-273):
- `precipitate-light-wind`
- `precipitate-wind`
- `precipitate-strong-wind`

**Step 4: Update WeatherLayer.ts precipitation rendering**

Replace the `precipAnim` logic and droplets HTML generation (lines 756-774):

```typescript
// Wind tilt via skewX — diagonal rain without breaking the seamless Y loop
const skewDeg =
  config.wind === "strong"
    ? 15
    : config.wind === "moderate"
      ? 8
      : config.wind === "light"
        ? 3
        : 0;

for (const precipLayer of config.precip) {
  const precipConfig = PRECIP_CONFIG[precipLayer.type];
  if (!precipConfig) continue;
  const count = Math.round(precipConfig.count * precipLayer.intensityScale);
  const particles = WeatherLayer.particleHTML(precipConfig, count);
  const skewStyle = skewDeg ? `transform:skewX(${skewDeg}deg);` : "";
  html += `<div class="droplets" style="animation-duration:${precipConfig.fallSpeed};animation-name:precipitate;${skewStyle}">`;
  html += `<div class="droplets-half">${particles}</div>`;
  html += `<div class="droplets-half">${particles}</div>`;
  html += "</div>";
}
```

**Step 5: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 6: Commit**

```
fix(weather): use skewX for wind-tilted rain to prevent loop stutter
```

---

### Task 9: Add re-render caching to prevent animation restarts

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts:592-777`

**Step 1: Write a test for caching behavior**

Add to the `WeatherLayer` describe block:

```typescript
it("does not rebuild innerHTML when weather and color are unchanged", () => {
  layer.update(makeState(501));
  const firstHTML = container.innerHTML;
  // Second update with same state should not change innerHTML
  layer.update(makeState(501));
  expect(container.innerHTML).toBe(firstHTML);
});

it("rebuilds innerHTML when weather id changes", () => {
  layer.update(makeState(501));
  const firstHTML = container.innerHTML;
  layer.update(makeState(601));
  expect(container.innerHTML).not.toBe(firstHTML);
});
```

**Step 2: Run tests — confirm caching test fails**

Run: `just app::test`
Expected: FAIL — innerHTML is rebuilt every time currently.

**Step 3: Add caching instance properties and conditional rebuild**

Add instance properties to the `WeatherLayer` class:

```typescript
export class WeatherLayer implements SceneComponent {
  private el: HTMLElement | null = null;
  private lastWeatherId: number | null = null;
  private lastCloudColor: string | null = null;
```

In the `update` method, after computing `config` and `color`, add caching logic:

```typescript
update(state: LiveWindowState): void {
  if (!this.el) return;
  const weatherId = state.computed.phase.weather.id;

  if (!weatherId || !WEATHER_EFFECTS[weatherId]) {
    if (this.lastWeatherId !== null) {
      this.el.className = "sky-layer weather";
      this.el.innerHTML = "";
      this.lastWeatherId = null;
      this.lastCloudColor = null;
    }
    return;
  }

  const config = WEATHER_EFFECTS[weatherId];

  // Smooth cloud color based on sun altitude, density, and sky gradient
  let cloudColor: string | null = null;
  if (config.clouds !== "none") {
    cloudColor = getCloudColor(config.clouds, state.computed.phase.sun.altitude, state.ref.currentGradient);
  }

  // Skip full rebuild if weather hasn't changed
  if (weatherId === this.lastWeatherId) {
    // Only update cloud color if it changed
    if (cloudColor !== null && cloudColor !== this.lastCloudColor) {
      this.el.style.setProperty("--cloud-color", cloudColor);
      this.lastCloudColor = cloudColor;
    }
    return;
  }

  // Full rebuild — weather ID changed
  this.lastWeatherId = weatherId;
  this.lastCloudColor = cloudColor;

  let cls = "sky-layer weather";
  if (config.clouds !== "none") cls += ` weather-clouds-${config.clouds}`;
  this.el.className = cls;

  if (cloudColor !== null) {
    this.el.style.setProperty("--cloud-color", cloudColor);
  }

  // ... rest of the HTML building stays the same ...
```

Also update `destroy` to reset cached state:

```typescript
destroy(): void {
  if (this.el) this.el.innerHTML = "";
  this.el = null;
  this.lastWeatherId = null;
  this.lastCloudColor = null;
}
```

**Step 4: Run tests**

Run: `just app::test`
Expected: All tests pass.

**Step 5: Commit**

```
fix(weather): cache weather rendering to prevent animation restarts on re-render
```

---

### Task 10: Run full test suite and typecheck

**Step 1: Run all tests**

Run: `just app::test`
Expected: All tests pass.

**Step 2: Run typecheck**

Run: `just app::typecheck`
Expected: No type errors.

**Step 3: Run build**

Run: `just app::build`
Expected: Build succeeds.

**Step 4: Final commit if any remaining changes**

No commit expected — all changes should be committed in prior tasks.
