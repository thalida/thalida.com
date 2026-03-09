---
title: Weather Code Audit — Distinct Rendering Implementation Plan
description: >-
  Make all 50 OpenWeatherMap weather codes visually distinct in the live window,
  with accurate real-world character.
publishedOn: 2026-03-07T05:28:23.000Z
planType: implementation
topic: weather-code-audit
status: completed
category: live-window
---

# Weather Code Audit — Distinct Rendering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make all 50 OpenWeatherMap weather codes visually distinct in the live window, with accurate real-world character.

**Architecture:** Extend the existing `WeatherEffectConfig` with 3 new mechanisms (wind levels, atmosphere particles, lightning variants) plus 6 new precip configs. All changes are in WeatherLayer.ts (config + rendering) and live-window.css (animations). No new files needed.

**Tech Stack:** TypeScript, CSS animations, Vitest

---

### Task 1: Add New Interfaces and Types

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts:199-209`

**Step 1: Add wind type and atmosphere particle interfaces**

Add after the existing `AtmosphereConfig` interface (line ~129):

```typescript
export type WindLevel = "none" | "light" | "moderate" | "strong";

export interface AtmosphereParticleConfig {
  count: number;
  color: string;
  /** Size range [min, max] in px */
  sizeRange: [number, number];
  /** Opacity range [min, max] as 0-100 integers */
  opacityRange: [number, number];
  /** CSS animation duration for particle motion */
  speed: string;
  /** Motion type: float = horizontal drift, swirl = circular, fall = downward */
  drift: "float" | "swirl" | "fall";
}

export type LightningVariant = "distant" | "standard" | "intense";
```

**Step 2: Update WeatherEffectConfig interface**

Replace the existing `WeatherEffectConfig` (line ~199):

```typescript
export interface WeatherEffectConfig {
  clouds: CloudDensity;
  precip: PrecipLayer[];
  lightning: LightningVariant | false;
  atmosphere: AtmosphereConfig | null;
  wind: WindLevel;
  atmosphereParticles: AtmosphereParticleConfig | null;
}
```

**Step 3: Update the `fx` helper**

Replace the existing `fx` function:

```typescript
function fx(
  clouds: WeatherEffectConfig["clouds"],
  precip: PrecipLayer[],
  opts?: {
    lightning?: LightningVariant;
    atmosphere?: AtmosphereConfig;
    wind?: WindLevel;
    atmosphereParticles?: AtmosphereParticleConfig;
  },
): WeatherEffectConfig {
  return {
    clouds,
    precip,
    lightning: opts?.lightning ?? false,
    atmosphere: opts?.atmosphere ?? null,
    wind: opts?.wind ?? "none",
    atmosphereParticles: opts?.atmosphereParticles ?? null,
  };
}
```

**Step 4: Run typecheck to identify all type errors**

Run: `cd app && npx tsc --noEmit 2>&1 | head -50`
Expected: Type errors in WEATHER_EFFECTS entries (lightning was `boolean`, now `LightningVariant | false`) and in tests. This confirms the new types are wired up.

**Step 5: Fix WEATHER_EFFECTS lightning values temporarily**

In the `WEATHER_EFFECTS` map, replace all `{ lightning: true }` with `{ lightning: "standard" }` so it compiles. We'll set the correct variants in Task 6.

**Step 6: Run typecheck again**

Run: `cd app && npx tsc --noEmit`
Expected: No errors (or only test file errors which we fix later).

**Step 7: Commit**

```bash
git add app/src/scripts/live-window/components/sky/WeatherLayer.ts
git commit -m "feat(weather): add wind, atmosphere particle, and lightning variant types"
```

---

### Task 2: Add New Precip Configs

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts:22-123`

**Step 1: Add 6 new precip configs**

Add these entries to `PRECIP_CONFIG` after the existing `showerSnow` entry:

```typescript
  drizzleLight: {
    count: 16,
    fallSpeed: "10s",
    shape: "drop",
    sizeW: [1, 2],
    aspectRatio: 2.5,
    color: "#28afff",
    opacityRange: [30, 55],
    hasSway: false,
  },
  drizzleHeavy: {
    count: 28,
    fallSpeed: "6s",
    shape: "drop",
    sizeW: [2, 4],
    aspectRatio: 2.5,
    color: "#28afff",
    opacityRange: [55, 80],
    hasSway: false,
  },
  showerDrizzle: {
    count: 25,
    fallSpeed: "4s",
    shape: "drop",
    sizeW: [2, 3],
    aspectRatio: 3,
    color: "#28afff",
    opacityRange: [45, 70],
    hasSway: false,
  },
  heavyRain: {
    count: 42,
    fallSpeed: "1.8s",
    shape: "drop",
    sizeW: [4, 5],
    aspectRatio: 2.5,
    color: "#28afff",
    opacityRange: [80, 100],
    hasSway: false,
  },
  extremeRain: {
    count: 50,
    fallSpeed: "1.2s",
    shape: "drop",
    sizeW: [4, 6],
    aspectRatio: 2,
    color: "#28afff",
    opacityRange: [85, 100],
    hasSway: false,
  },
  showerSleet: {
    count: 35,
    fallSpeed: "3s",
    shape: "round",
    sizeW: [3, 6],
    aspectRatio: 1,
    color: "#a0cfff",
    opacityRange: [55, 90],
    hasSway: true,
  },
```

**Step 2: Run typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/components/sky/WeatherLayer.ts
git commit -m "feat(weather): add 6 new precip configs for intensity differentiation"
```

---

### Task 3: Add Atmosphere Particle Configs and Fix Sand/Dust

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts:131-142`

**Step 1: Fix sand/dust atmosphere overlays to be distinct**

Replace the single `dust` entry in `ATMOSPHERE_CONFIG` with two distinct entries and update references:

```typescript
export const ATMOSPHERE_CONFIG: Record<string, AtmosphereConfig> = {
  mist: { color: "#c8c8c8", opacity: 0.15, layers: 2 },
  fog: { color: "#b0b0b0", opacity: 0.35, layers: 3 },
  smoke: { color: "#8b7355", opacity: 0.3, layers: 3 },
  haze: { color: "#d4c89a", opacity: 0.2, layers: 2 },
  sand: { color: "#c4a050", opacity: 0.3, layers: 3 },
  dust: { color: "#8a7560", opacity: 0.22, layers: 2 },
  dustWhirls: { color: "#c4a86a", opacity: 0.35, layers: 3 },
  volcanicAsh: { color: "#555555", opacity: 0.4, layers: 3 },
  squalls: { color: "#888888", opacity: 0.3, layers: 3 },
  tornado: { color: "#666666", opacity: 0.45, layers: 3 },
  stormDark: { color: "#1a1a2e", opacity: 0.2, layers: 2 },
};
```

Note: `dust` entry changed from `{ color: "#c4a86a", opacity: 0.25, layers: 2 }` to `{ color: "#8a7560", opacity: 0.22, layers: 2 }`. New `sand` entry added with yellowish color.

**Step 2: Update WEATHER_EFFECTS 751 to use `sand` instead of `dust`**

Change line for code 751:
```typescript
751: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.sand }),
```

Keep 761 as:
```typescript
761: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.dust }),
```

**Step 3: Add atmosphere particle configs**

Add after `ATMOSPHERE_CONFIG`:

```typescript
export const ATMO_PARTICLE_CONFIG: Record<string, AtmosphereParticleConfig> = {
  mistWisps: {
    count: 6, color: "#d0d0d0", sizeRange: [20, 45],
    opacityRange: [12, 30], speed: "14s", drift: "float",
  },
  fogBanks: {
    count: 4, color: "#c0c0c0", sizeRange: [35, 70],
    opacityRange: [25, 50], speed: "18s", drift: "float",
  },
  smokeWisps: {
    count: 10, color: "#7a6548", sizeRange: [25, 55],
    opacityRange: [18, 40], speed: "11s", drift: "float",
  },
  dustSwirl: {
    count: 20, color: "#a08860", sizeRange: [2, 5],
    opacityRange: [30, 55], speed: "5s", drift: "swirl",
  },
  sandSwirl: {
    count: 28, color: "#c4a050", sizeRange: [2, 4],
    opacityRange: [40, 65], speed: "3.5s", drift: "swirl",
  },
  ashFall: {
    count: 18, color: "#444", sizeRange: [3, 6],
    opacityRange: [35, 65], speed: "7s", drift: "fall",
  },
  debrisSwirl: {
    count: 15, color: "#5a5040", sizeRange: [3, 8],
    opacityRange: [30, 55], speed: "4s", drift: "swirl",
  },
  iceGlint: {
    count: 12, color: "#e0f0ff", sizeRange: [1, 3],
    opacityRange: [40, 80], speed: "3s", drift: "float",
  },
};
```

**Step 4: Run typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add app/src/scripts/live-window/components/sky/WeatherLayer.ts
git commit -m "feat(weather): add atmosphere particle configs and distinct sand/dust overlays"
```

---

### Task 4: Update All WEATHER_EFFECTS Entries

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts:228-290`

**Step 1: Replace the entire WEATHER_EFFECTS map**

```typescript
export const WEATHER_EFFECTS: Record<number, WeatherEffectConfig> = {
  // 2xx Thunderstorm
  200: fx("heavy", [p("lightRain", 0.6)], { lightning: "distant" }),
  201: fx("storm", [p("rain")], { lightning: "standard" }),
  202: fx("storm", [p("heavyRain")], { lightning: "intense", atmosphere: ATMOSPHERE_CONFIG.stormDark, wind: "moderate" }),
  210: fx("heavy", [], { lightning: "distant" }),
  211: fx("storm", [], { lightning: "standard" }),
  212: fx("storm", [], { lightning: "intense", atmosphere: ATMOSPHERE_CONFIG.stormDark }),
  221: fx("storm", [p("lightRain", 0.4)], { lightning: "standard" }),
  230: fx("heavy", [p("drizzle")], { lightning: "standard" }),
  231: fx("storm", [p("drizzle", 1.4)], { lightning: "standard" }),
  232: fx("storm", [p("drizzle", 1.8)], { lightning: "intense", atmosphere: ATMOSPHERE_CONFIG.stormDark, wind: "moderate" }),

  // 3xx Drizzle
  300: fx("light", [p("drizzleLight")]),
  301: fx("medium", [p("drizzle")]),
  302: fx("medium", [p("drizzleHeavy")]),
  310: fx("medium", [p("drizzle", 0.6), p("lightRain", 0.4)]),
  311: fx("medium", [p("drizzle", 0.7), p("lightRain", 0.7)]),
  312: fx("medium", [p("drizzleHeavy", 0.8), p("rain", 0.7)]),
  313: fx("medium", [p("showerRain", 0.7), p("drizzle", 0.5)], { wind: "light" }),
  314: fx("heavy", [p("showerRain", 1.2), p("drizzleHeavy", 0.6)], { wind: "moderate" }),
  321: fx("medium", [p("showerDrizzle")], { wind: "light" }),

  // 5xx Rain
  500: fx("medium", [p("lightRain", 0.6)]),
  501: fx("medium", [p("rain")]),
  502: fx("heavy", [p("heavyRain")]),
  503: fx("heavy", [p("heavyRain", 1.3)], { wind: "light" }),
  504: fx("storm", [p("extremeRain")], { wind: "moderate", atmosphere: ATMOSPHERE_CONFIG.stormDark }),
  511: fx("heavy", [p("freezingRain")], { atmosphereParticles: ATMO_PARTICLE_CONFIG.iceGlint }),
  520: fx("medium", [p("showerRain", 0.6)], { wind: "light" }),
  521: fx("medium", [p("showerRain")], { wind: "light" }),
  522: fx("heavy", [p("showerRain", 1.4)], { wind: "moderate" }),
  531: fx("medium", [p("showerRain", 0.5), p("lightRain", 0.3)]),

  // 6xx Snow
  600: fx("medium", [p("lightSnow", 0.6)]),
  601: fx("medium", [p("snow")]),
  602: fx("heavy", [p("heavySnow", 1.4)]),
  611: fx("medium", [p("sleet")]),
  612: fx("medium", [p("showerSleet", 0.6)], { wind: "light" }),
  613: fx("medium", [p("showerSleet")], { wind: "light" }),
  615: fx("medium", [p("lightRain", 0.5), p("lightSnow", 0.5)]),
  616: fx("heavy", [p("rain", 0.7), p("snow", 0.7)]),
  620: fx("medium", [p("showerSnow", 0.6)], { wind: "light" }),
  621: fx("medium", [p("showerSnow")], { wind: "light" }),
  622: fx("heavy", [p("showerSnow", 1.4)], { wind: "moderate" }),

  // 7xx Atmosphere
  701: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.mist, atmosphereParticles: ATMO_PARTICLE_CONFIG.mistWisps }),
  711: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.smoke, atmosphereParticles: ATMO_PARTICLE_CONFIG.smokeWisps }),
  721: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.haze }),
  731: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.dustWhirls, atmosphereParticles: ATMO_PARTICLE_CONFIG.dustSwirl }),
  741: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.fog, atmosphereParticles: ATMO_PARTICLE_CONFIG.fogBanks }),
  751: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.sand, atmosphereParticles: ATMO_PARTICLE_CONFIG.sandSwirl }),
  761: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.dust, atmosphereParticles: ATMO_PARTICLE_CONFIG.dustSwirl }),
  762: fx("none", [], { atmosphere: ATMOSPHERE_CONFIG.volcanicAsh, atmosphereParticles: ATMO_PARTICLE_CONFIG.ashFall }),
  771: fx("heavy", [p("heavyRain")], { atmosphere: ATMOSPHERE_CONFIG.squalls, wind: "strong" }),
  781: fx("storm", [p("extremeRain")], { atmosphere: ATMOSPHERE_CONFIG.tornado, wind: "strong", atmosphereParticles: ATMO_PARTICLE_CONFIG.debrisSwirl }),

  // 800+ Clear/Clouds
  800: fx("none", []),
  801: fx("light", []),
  802: fx("medium", []),
  803: fx("heavy", []),
  804: fx("storm", []),
};
```

**Step 2: Run typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: PASS (test files may have errors, that's OK for now)

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/components/sky/WeatherLayer.ts
git commit -m "feat(weather): update all 50 weather code configs with distinct effects"
```

---

### Task 5: Add Atmosphere Particle Rendering

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts`

**Step 1: Add `atmosphereParticleHTML` static method**

Add after the existing `particleHTML` method:

```typescript
  /** Generate atmosphere particles (mist wisps, dust, ash, etc.) with deterministic placement. */
  static atmosphereParticleHTML(config: AtmosphereParticleConfig): string {
    const sRange = config.sizeRange[1] - config.sizeRange[0];
    const opRange = config.opacityRange[1] - config.opacityRange[0];

    let out = "";
    for (let i = 0; i < config.count; i++) {
      const h = ((i + 1) * 2654435761) >>> 0;
      const left = h % 100;
      const top = ((h >>> 8) ^ (i * 37)) % 80; // keep in upper 80% for float/swirl
      const size = config.sizeRange[0] + (h % (sRange + 1));
      const opacity = (config.opacityRange[0] + ((h >>> 4) % (opRange + 1))) / 100;
      const dur = parseFloat(config.speed) + ((h >>> 12) % 30) / 10;
      const delay = -((h >>> 16) % 80) / 10;

      out += `<div class="atmo-particle atmo-${config.drift}" style="left:${left}%;top:${top}%;width:${size}px;height:${size}px;opacity:${opacity};background:${config.color};animation-duration:${dur.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s"></div>`;
    }
    return out;
  }
```

**Step 2: Update the `update()` method to render atmosphere particles**

In the `update()` method, add after the atmosphere overlay rendering block (after the `if (config.atmosphere)` block):

```typescript
    // Atmosphere particles
    if (config.atmosphereParticles) {
      html += WeatherLayer.atmosphereParticleHTML(config.atmosphereParticles);
    }
```

**Step 3: Run typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/components/sky/WeatherLayer.ts
git commit -m "feat(weather): add atmosphere particle rendering for mist/dust/ash/etc"
```

---

### Task 6: Add Wind Support to Precipitation Rendering

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts`

**Step 1: Update precipitation rendering to use wind animation**

In the `update()` method, find the precipitation loop and update it to select the correct animation name based on wind level:

Replace the existing precipitation rendering block:

```typescript
    // Precipitation layers
    const precipAnim =
      config.wind === "strong" ? "precipitate-strong-wind" :
      config.wind === "moderate" ? "precipitate-wind" :
      config.wind === "light" ? "precipitate-light-wind" :
      "precipitate";

    for (const precipLayer of config.precip) {
      const precipConfig = PRECIP_CONFIG[precipLayer.type];
      if (!precipConfig) continue;
      const count = Math.round(precipConfig.count * precipLayer.intensityScale);
      const particles = WeatherLayer.particleHTML(precipConfig, count);
      html += `<div class="droplets" style="animation-duration:${precipConfig.fallSpeed};animation-name:${precipAnim}">`;
      html += `<div class="droplets-half">${particles}</div>`;
      html += `<div class="droplets-half">${particles}</div>`;
      html += "</div>";
    }
```

**Step 2: Run typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/components/sky/WeatherLayer.ts
git commit -m "feat(weather): add wind-driven precipitation with angled fall"
```

---

### Task 7: Redesign Lightning Rendering

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts`

**Step 1: Add a `lightningHTML` static method**

Add after `atmosphereParticleHTML`:

```typescript
  /** Generate lightning bolt HTML based on variant intensity. */
  static lightningHTML(variant: LightningVariant): string {
    switch (variant) {
      case "distant":
        return '<div class="lightning lightning-distant"></div>';
      case "intense":
        return '<div class="lightning lightning-intense"></div><div class="lightning lightning-intense lightning-secondary"></div>';
      default: // "standard"
        return '<div class="lightning lightning-standard"></div>';
    }
  }
```

**Step 2: Update the `update()` method to use `lightningHTML`**

Replace the existing lightning rendering:

```typescript
    // Lightning
    if (config.lightning) {
      html += WeatherLayer.lightningHTML(config.lightning);
    }
```

**Step 3: Run typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/components/sky/WeatherLayer.ts
git commit -m "feat(weather): redesign lightning with distant/standard/intense variants"
```

---

### Task 8: Add New CSS Animations and Classes

**Files:**
- Modify: `app/src/scripts/live-window/live-window.css`

**Step 1: Add wind precipitation keyframes**

Add after the existing `@keyframes precipitate` block:

```css
@keyframes precipitate-light-wind {
  from {
    transform: translate3d(-3%, -50%, 0);
  }
  to {
    transform: translate3d(3%, 0%, 0);
  }
}

@keyframes precipitate-wind {
  from {
    transform: translate3d(-8%, -50%, 0);
  }
  to {
    transform: translate3d(8%, 0%, 0);
  }
}

@keyframes precipitate-strong-wind {
  from {
    transform: translate3d(-15%, -50%, 0);
  }
  to {
    transform: translate3d(15%, 0%, 0);
  }
}
```

**Step 2: Add atmosphere particle base class and motion keyframes**

Add after the existing atmosphere section:

```css
/* Atmosphere particles */

.atmo-particle {
  position: absolute;
  border-radius: 50%;
  filter: blur(4px);
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

.atmo-float {
  animation-name: atmo-float;
  animation-direction: alternate;
}

.atmo-swirl {
  animation-name: atmo-swirl;
  filter: blur(1px);
}

.atmo-fall {
  animation-name: atmo-fall;
  animation-timing-function: linear;
}

@keyframes atmo-float {
  0% {
    transform: translate(-10%, 5%) scale(1);
  }
  50% {
    transform: translate(10%, -5%) scale(1.1);
  }
  100% {
    transform: translate(-10%, 5%) scale(1);
  }
}

@keyframes atmo-swirl {
  0% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(15px, -10px) rotate(90deg);
  }
  50% {
    transform: translate(-5px, 5px) rotate(180deg);
  }
  75% {
    transform: translate(10px, 10px) rotate(270deg);
  }
  100% {
    transform: translate(0, 0) rotate(360deg);
  }
}

@keyframes atmo-fall {
  0% {
    transform: translate(-5px, -20%);
  }
  100% {
    transform: translate(5px, 100%);
  }
}
```

**Step 3: Redesign lightning CSS**

Replace the entire lightning CSS section (`.weather .lightning` through `.weather .lightning::after`) with:

```css
/* Lightning */

.weather .lightning {
  position: absolute;
  top: 0;
  left: 50%;
  width: 3px;
  height: 100%;
  pointer-events: none;
  filter: blur(0.5px);
}

/* Bolt shape via clip-path — jagged zigzag */
.weather .lightning::before {
  content: "";
  position: absolute;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
  background: #fffbe6;
  clip-path: polygon(
    50% 0%, 35% 30%, 55% 32%,
    30% 65%, 52% 67%, 25% 100%,
    55% 60%, 38% 58%, 60% 28%,
    42% 26%
  );
}

/* Glow behind the bolt */
.weather .lightning::after {
  content: "";
  position: absolute;
  top: 5%;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 30%;
  filter: blur(8px);
}

/* Distant: small, dim, slow */
.weather .lightning-distant {
  animation: lightning-flash-distant 4s linear infinite;
}

.weather .lightning-distant::before {
  width: 12px;
  height: 60px;
}

.weather .lightning-distant::after {
  width: 20px;
  height: 65px;
  background: rgba(255, 255, 200, 0.15);
}

/* Standard: medium bolt with branch */
.weather .lightning-standard {
  animation: lightning-flash-standard 2.5s linear infinite;
}

.weather .lightning-standard::before {
  width: 18px;
  height: 100px;
}

.weather .lightning-standard::after {
  width: 30px;
  height: 105px;
  background: rgba(255, 255, 200, 0.25);
}

/* Intense: large bolt, bright glow, fast double-flash */
.weather .lightning-intense {
  animation: lightning-flash-intense 1.5s linear infinite;
}

.weather .lightning-intense::before {
  width: 24px;
  height: 130px;
}

.weather .lightning-intense::after {
  width: 40px;
  height: 135px;
  background: rgba(255, 255, 200, 0.35);
}

/* Secondary bolt offset for intense variant */
.weather .lightning-secondary {
  left: 25%;
  animation-delay: -0.3s;
  opacity: 0.7;
}

.weather .lightning-secondary::before {
  width: 14px;
  height: 80px;
  top: 15%;
}

.weather .lightning-secondary::after {
  width: 24px;
  height: 85px;
  top: 15%;
}

/* Lightning flash animations */
@keyframes lightning-flash-distant {
  0%, 8%, 100% {
    opacity: 0;
  }
  4% {
    opacity: 0.6;
  }
}

@keyframes lightning-flash-standard {
  0%, 10%, 100% {
    opacity: 0;
  }
  5% {
    opacity: 1;
  }
}

@keyframes lightning-flash-intense {
  0%, 8%, 16%, 100% {
    opacity: 0;
  }
  4% {
    opacity: 1;
  }
  12% {
    opacity: 0.9;
  }
}
```

**Step 4: Commit**

```bash
git add app/src/scripts/live-window/live-window.css
git commit -m "feat(weather): add wind, atmosphere particle, and lightning CSS animations"
```

---

### Task 9: Update getSkyDarkenOpacity for New Types

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts:296-327`

**Step 1: Update `getSkyDarkenOpacity` to handle new lightning type**

The existing function checks `config.lightning` as boolean. Now it's `LightningVariant | false`. Update:

```typescript
function getSkyDarkenOpacity(config: WeatherEffectConfig): number {
  let opacity = 0;

  switch (config.clouds) {
    case "light":
      opacity += 0.05;
      break;
    case "medium":
      opacity += 0.12;
      break;
    case "heavy":
      opacity += 0.22;
      break;
    case "storm":
      opacity += 0.28;
      break;
  }

  for (const layer of config.precip) {
    opacity += 0.05 * layer.intensityScale;
  }

  if (config.lightning) {
    opacity += config.lightning === "intense" ? 0.16 : config.lightning === "distant" ? 0.06 : 0.12;
  }

  if (config.atmosphere) {
    opacity += config.atmosphere.opacity * 0.3;
  }

  return Math.min(opacity, 0.55);
}
```

**Step 2: Run typecheck**

Run: `cd app && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/components/sky/WeatherLayer.ts
git commit -m "feat(weather): update sky darkening for lightning variants"
```

---

### Task 10: Update Tests

**Files:**
- Modify: `app/src/scripts/live-window/__tests__/layers/weather.test.ts`

**Step 1: Update the test file**

The existing tests check `lightning: true/false`. Update all lightning assertions to use variant strings. Also add tests for new features. Key changes:

1. `thunderstorm IDs have lightning` — change `toBe(true)` to `toBeTruthy()` (since it's now a string, truthy works)
2. `non-thunderstorm IDs do not have lightning` — change `toBe(false)` stays the same
3. `heavy thunderstorms have dark atmosphere overlay` — no change needed
4. `non-atmosphere IDs do not have atmosphere configs` — update: 511 now has atmosphereParticles (not atmosphere), test should still pass since it checks `atmosphere` not `atmosphereParticles`
5. Add test: `squalls and tornado have heavy clouds` — update: 781 is now storm density
6. Add test: `renders lightning for thunderstorm (201)` — check `.lightning-standard` class
7. Add test for new precip configs existing
8. Add test for atmosphere particle configs existing
9. Add test for wind levels on shower/storm codes
10. Add test for 804 being storm density
11. Add test for 751 and 761 having distinct atmosphere configs

Replace the full test file with updated assertions:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  WeatherLayer,
  WEATHER_EFFECTS,
  PRECIP_CONFIG,
  ATMOSPHERE_CONFIG,
  ATMO_PARTICLE_CONFIG,
  CLOUD_CONFIGS,
} from "../../components/sky/WeatherLayer";
import { makeTestState } from "../helpers";

function makeState(weatherId: number | null) {
  if (weatherId === null) {
    return makeTestState({ store: { weather: { current: null } } });
  }
  return makeTestState({
    store: {
      weather: {
        current: { id: weatherId, main: "Test", description: "test", icon: "01d", temp: 20 },
      },
    },
  });
}

describe("WEATHER_EFFECTS", () => {
  it("covers all thunderstorm IDs (2xx)", () => {
    for (const id of [200, 201, 202, 210, 211, 212, 221, 230, 231, 232]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all drizzle IDs (3xx)", () => {
    for (const id of [300, 301, 302, 310, 311, 312, 313, 314, 321]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all rain IDs (5xx)", () => {
    for (const id of [500, 501, 502, 503, 504, 511, 520, 521, 522, 531]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all snow IDs (6xx)", () => {
    for (const id of [600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all atmosphere IDs (7xx)", () => {
    for (const id of [701, 711, 721, 731, 741, 751, 761, 762, 771, 781]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("covers all clear/cloud IDs (800+)", () => {
    for (const id of [800, 801, 802, 803, 804]) {
      expect(WEATHER_EFFECTS[id]).toBeDefined();
    }
  });

  it("thunderstorm IDs have lightning variants", () => {
    for (const id of [200, 201, 202, 210, 211, 212, 221, 230, 231, 232]) {
      expect(WEATHER_EFFECTS[id].lightning).toBeTruthy();
    }
  });

  it("light thunderstorms use distant lightning", () => {
    expect(WEATHER_EFFECTS[200].lightning).toBe("distant");
    expect(WEATHER_EFFECTS[210].lightning).toBe("distant");
  });

  it("heavy thunderstorms use intense lightning", () => {
    expect(WEATHER_EFFECTS[202].lightning).toBe("intense");
    expect(WEATHER_EFFECTS[212].lightning).toBe("intense");
    expect(WEATHER_EFFECTS[232].lightning).toBe("intense");
  });

  it("light thunderstorms have fewer clouds than heavy thunderstorms", () => {
    expect(WEATHER_EFFECTS[200].clouds).toBe("heavy");
    expect(WEATHER_EFFECTS[201].clouds).toBe("storm");
    expect(WEATHER_EFFECTS[202].clouds).toBe("storm");
    expect(WEATHER_EFFECTS[210].clouds).toBe("heavy");
    expect(WEATHER_EFFECTS[211].clouds).toBe("storm");
    expect(WEATHER_EFFECTS[212].clouds).toBe("storm");
  });

  it("heavy thunderstorms have dark atmosphere overlay", () => {
    expect(WEATHER_EFFECTS[202].atmosphere).toBe(ATMOSPHERE_CONFIG.stormDark);
    expect(WEATHER_EFFECTS[212].atmosphere).toBe(ATMOSPHERE_CONFIG.stormDark);
    expect(WEATHER_EFFECTS[232].atmosphere).toBe(ATMOSPHERE_CONFIG.stormDark);
    expect(WEATHER_EFFECTS[200].atmosphere).toBeNull();
    expect(WEATHER_EFFECTS[201].atmosphere).toBeNull();
    expect(WEATHER_EFFECTS[211].atmosphere).toBeNull();
  });

  it("non-thunderstorm IDs do not have lightning", () => {
    for (const id of [300, 500, 600, 701, 800]) {
      expect(WEATHER_EFFECTS[id].lightning).toBe(false);
    }
  });

  it("rain+snow (615, 616) have dual precipitation layers", () => {
    expect(WEATHER_EFFECTS[615].precip.length).toBe(2);
    expect(WEATHER_EFFECTS[616].precip.length).toBe(2);
  });

  it("drizzle+rain combos (310-314) have dual precipitation layers", () => {
    for (const id of [310, 311, 312, 313, 314]) {
      expect(WEATHER_EFFECTS[id].precip.length).toBe(2);
    }
  });

  it("atmosphere IDs have atmosphere configs", () => {
    for (const id of [701, 711, 721, 731, 741, 751, 761, 762, 771, 781]) {
      expect(WEATHER_EFFECTS[id].atmosphere).not.toBeNull();
    }
  });

  it("non-atmosphere IDs do not have atmosphere configs", () => {
    for (const id of [300, 500, 600, 800]) {
      expect(WEATHER_EFFECTS[id].atmosphere).toBeNull();
    }
  });

  it("squalls have heavy clouds and tornado has storm clouds", () => {
    expect(WEATHER_EFFECTS[771].clouds).toBe("heavy");
    expect(WEATHER_EFFECTS[781].clouds).toBe("storm");
  });

  it("squalls and tornado have precipitation", () => {
    expect(WEATHER_EFFECTS[771].precip.length).toBeGreaterThan(0);
    expect(WEATHER_EFFECTS[781].precip.length).toBeGreaterThan(0);
  });

  it("squalls and tornado have strong wind", () => {
    expect(WEATHER_EFFECTS[771].wind).toBe("strong");
    expect(WEATHER_EFFECTS[781].wind).toBe("strong");
  });

  it("clear sky (800) has no effects", () => {
    const config = WEATHER_EFFECTS[800];
    expect(config.clouds).toBe("none");
    expect(config.precip).toEqual([]);
    expect(config.lightning).toBe(false);
    expect(config.atmosphere).toBeNull();
    expect(config.wind).toBe("none");
    expect(config.atmosphereParticles).toBeNull();
  });

  it("804 (overcast) has storm density, more than 803 (broken)", () => {
    expect(WEATHER_EFFECTS[803].clouds).toBe("heavy");
    expect(WEATHER_EFFECTS[804].clouds).toBe("storm");
  });

  it("751 (sand) and 761 (dust) have distinct atmosphere configs", () => {
    expect(WEATHER_EFFECTS[751].atmosphere).not.toBe(WEATHER_EFFECTS[761].atmosphere);
    expect(WEATHER_EFFECTS[751].atmosphere!.color).not.toBe(WEATHER_EFFECTS[761].atmosphere!.color);
  });

  it("shower variants have wind", () => {
    for (const id of [520, 521, 522, 620, 621, 622, 612, 613, 313, 314, 321]) {
      expect(WEATHER_EFFECTS[id].wind).not.toBe("none");
    }
  });

  it("non-shower rain/snow/drizzle have no wind", () => {
    for (const id of [300, 301, 302, 500, 501, 600, 601, 611]) {
      expect(WEATHER_EFFECTS[id].wind).toBe("none");
    }
  });

  it("atmosphere codes have atmosphere particles except haze", () => {
    for (const id of [701, 711, 731, 741, 751, 761, 762, 781]) {
      expect(WEATHER_EFFECTS[id].atmosphereParticles).not.toBeNull();
    }
    // Haze is uniform, no particles
    expect(WEATHER_EFFECTS[721].atmosphereParticles).toBeNull();
  });

  it("freezing rain (511) has ice glint particles", () => {
    expect(WEATHER_EFFECTS[511].atmosphereParticles).toBe(ATMO_PARTICLE_CONFIG.iceGlint);
  });
});

describe("PRECIP_CONFIG", () => {
  it("defines configs for all precipitation types", () => {
    const expected = [
      "lightRain", "rain", "snow", "sleet", "drizzle", "showerRain",
      "freezingRain", "lightSnow", "heavySnow", "showerSnow",
      "drizzleLight", "drizzleHeavy", "showerDrizzle",
      "heavyRain", "extremeRain", "showerSleet",
    ];
    for (const key of expected) {
      expect(PRECIP_CONFIG[key]).toBeDefined();
    }
  });

  it("rain is fastest, snow is slowest", () => {
    const speed = (s: string) => parseFloat(s);
    expect(speed(PRECIP_CONFIG.rain.fallSpeed)).toBeLessThan(speed(PRECIP_CONFIG.snow.fallSpeed));
  });

  it("snow has sway, rain does not", () => {
    expect(PRECIP_CONFIG.snow.hasSway).toBe(true);
    expect(PRECIP_CONFIG.rain.hasSway).toBe(false);
  });

  it("drizzle is slower than lightRain", () => {
    const speed = (s: string) => parseFloat(s);
    expect(speed(PRECIP_CONFIG.drizzle.fallSpeed)).toBeGreaterThan(speed(PRECIP_CONFIG.lightRain.fallSpeed));
  });

  it("freezingRain has blue-white color distinct from regular rain", () => {
    expect(PRECIP_CONFIG.freezingRain.color).not.toBe(PRECIP_CONFIG.rain.color);
  });

  it("drizzleLight is slower and smaller than drizzle", () => {
    const speed = (s: string) => parseFloat(s);
    expect(speed(PRECIP_CONFIG.drizzleLight.fallSpeed)).toBeGreaterThan(speed(PRECIP_CONFIG.drizzle.fallSpeed));
    expect(PRECIP_CONFIG.drizzleLight.sizeW[1]).toBeLessThanOrEqual(PRECIP_CONFIG.drizzle.sizeW[0]);
  });

  it("heavyRain has bigger drops than rain", () => {
    expect(PRECIP_CONFIG.heavyRain.sizeW[0]).toBeGreaterThan(PRECIP_CONFIG.rain.sizeW[0]);
  });

  it("extremeRain is fastest and densest", () => {
    const speed = (s: string) => parseFloat(s);
    expect(speed(PRECIP_CONFIG.extremeRain.fallSpeed)).toBeLessThan(speed(PRECIP_CONFIG.heavyRain.fallSpeed));
    expect(PRECIP_CONFIG.extremeRain.count).toBeGreaterThan(PRECIP_CONFIG.heavyRain.count);
  });

  it("showerSleet is faster than regular sleet", () => {
    const speed = (s: string) => parseFloat(s);
    expect(speed(PRECIP_CONFIG.showerSleet.fallSpeed)).toBeLessThan(speed(PRECIP_CONFIG.sleet.fallSpeed));
  });
});

describe("ATMOSPHERE_CONFIG", () => {
  it("defines configs for all atmosphere types", () => {
    expect(ATMOSPHERE_CONFIG.mist).toBeDefined();
    expect(ATMOSPHERE_CONFIG.fog).toBeDefined();
    expect(ATMOSPHERE_CONFIG.smoke).toBeDefined();
    expect(ATMOSPHERE_CONFIG.haze).toBeDefined();
    expect(ATMOSPHERE_CONFIG.sand).toBeDefined();
    expect(ATMOSPHERE_CONFIG.dust).toBeDefined();
    expect(ATMOSPHERE_CONFIG.dustWhirls).toBeDefined();
    expect(ATMOSPHERE_CONFIG.volcanicAsh).toBeDefined();
    expect(ATMOSPHERE_CONFIG.squalls).toBeDefined();
    expect(ATMOSPHERE_CONFIG.tornado).toBeDefined();
    expect(ATMOSPHERE_CONFIG.stormDark).toBeDefined();
  });

  it("fog is denser than mist", () => {
    expect(ATMOSPHERE_CONFIG.fog.opacity).toBeGreaterThan(ATMOSPHERE_CONFIG.mist.opacity);
  });

  it("smoke has brownish color distinct from mist grey", () => {
    expect(ATMOSPHERE_CONFIG.smoke.color).not.toBe(ATMOSPHERE_CONFIG.mist.color);
  });

  it("sand and dust have distinct colors", () => {
    expect(ATMOSPHERE_CONFIG.sand.color).not.toBe(ATMOSPHERE_CONFIG.dust.color);
  });

  it("each config has required fields", () => {
    for (const key of Object.keys(ATMOSPHERE_CONFIG)) {
      const config = ATMOSPHERE_CONFIG[key];
      expect(config).toHaveProperty("color");
      expect(config).toHaveProperty("opacity");
      expect(config).toHaveProperty("layers");
      expect(config.layers).toBeGreaterThanOrEqual(1);
      expect(config.layers).toBeLessThanOrEqual(3);
    }
  });
});

describe("ATMO_PARTICLE_CONFIG", () => {
  it("defines all atmosphere particle types", () => {
    const expected = [
      "mistWisps", "fogBanks", "smokeWisps", "dustSwirl",
      "sandSwirl", "ashFall", "debrisSwirl", "iceGlint",
    ];
    for (const key of expected) {
      expect(ATMO_PARTICLE_CONFIG[key]).toBeDefined();
    }
  });

  it("each config has required fields", () => {
    for (const key of Object.keys(ATMO_PARTICLE_CONFIG)) {
      const config = ATMO_PARTICLE_CONFIG[key];
      expect(config.count).toBeGreaterThan(0);
      expect(config.sizeRange[0]).toBeLessThan(config.sizeRange[1]);
      expect(config.opacityRange[0]).toBeLessThan(config.opacityRange[1]);
      expect(["float", "swirl", "fall"]).toContain(config.drift);
    }
  });

  it("dust and sand swirl particles have distinct colors", () => {
    expect(ATMO_PARTICLE_CONFIG.dustSwirl.color).not.toBe(ATMO_PARTICLE_CONFIG.sandSwirl.color);
  });
});

describe("WeatherLayer.cloudHTML", () => {
  it("generates the configured number of clouds for each density", () => {
    for (const [density, config] of Object.entries(CLOUD_CONFIGS)) {
      const html = WeatherLayer.cloudHTML(density as "light" | "medium" | "heavy" | "storm");
      const matches = html.match(/class="cloud"/g);
      expect(matches?.length).toBe(config.count);
    }
  });

  it("produces deterministic output", () => {
    const a = WeatherLayer.cloudHTML("heavy");
    const b = WeatherLayer.cloudHTML("heavy");
    expect(a).toBe(b);
  });

  it("storm has more clouds than heavy", () => {
    const storm = WeatherLayer.cloudHTML("storm").match(/class="cloud"/g)?.length ?? 0;
    const heavy = WeatherLayer.cloudHTML("heavy").match(/class="cloud"/g)?.length ?? 0;
    expect(storm).toBeGreaterThan(heavy);
  });
});

describe("WeatherLayer.particleHTML", () => {
  it("generates the configured number of particles", () => {
    const html = WeatherLayer.particleHTML(PRECIP_CONFIG.rain);
    const matches = html.match(/class="particle"/g);
    expect(matches?.length).toBe(PRECIP_CONFIG.rain.count);
  });

  it("omits sway animation for non-sway configs", () => {
    const html = WeatherLayer.particleHTML(PRECIP_CONFIG.rain);
    expect(html).not.toContain("animation-name:");
  });

  it("includes sway animation for sway configs", () => {
    const html = WeatherLayer.particleHTML(PRECIP_CONFIG.snow);
    expect(html).toContain("animation-name:sway");
  });

  it("uses the configured color", () => {
    expect(WeatherLayer.particleHTML(PRECIP_CONFIG.snow)).toContain("background:#fff");
    expect(WeatherLayer.particleHTML(PRECIP_CONFIG.sleet)).toContain("background:#a0cfff");
  });

  it("produces deterministic output", () => {
    const a = WeatherLayer.particleHTML(PRECIP_CONFIG.snow);
    const b = WeatherLayer.particleHTML(PRECIP_CONFIG.snow);
    expect(a).toBe(b);
  });

  it("respects count override", () => {
    const html = WeatherLayer.particleHTML(PRECIP_CONFIG.rain, 10);
    const matches = html.match(/class="particle"/g);
    expect(matches?.length).toBe(10);
  });
});

describe("WeatherLayer.atmosphereParticleHTML", () => {
  it("generates the configured number of particles", () => {
    const html = WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.dustSwirl);
    const matches = html.match(/class="atmo-particle/g);
    expect(matches?.length).toBe(ATMO_PARTICLE_CONFIG.dustSwirl.count);
  });

  it("uses correct drift class", () => {
    expect(WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.mistWisps)).toContain("atmo-float");
    expect(WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.dustSwirl)).toContain("atmo-swirl");
    expect(WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.ashFall)).toContain("atmo-fall");
  });

  it("produces deterministic output", () => {
    const a = WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.fogBanks);
    const b = WeatherLayer.atmosphereParticleHTML(ATMO_PARTICLE_CONFIG.fogBanks);
    expect(a).toBe(b);
  });
});

describe("WeatherLayer", () => {
  let layer: WeatherLayer;
  let container: HTMLElement;

  beforeEach(() => {
    layer = new WeatherLayer();
    container = document.createElement("div");
    layer.mount(container);
  });

  it("renders nothing when weather id is null", () => {
    layer.update(makeState(null));
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for clear sky (800)", () => {
    layer.update(makeState(800));
    expect(container.innerHTML).toBe("");
  });

  it("renders procedural clouds for 801 (few clouds)", () => {
    layer.update(makeState(801));
    const clouds = container.querySelectorAll(".cloud");
    expect(clouds.length).toBe(CLOUD_CONFIGS.light.count);
    expect(container.querySelector(".droplets")).toBeFalsy();
  });

  it("renders more clouds for 802 (scattered) than 801 (few)", () => {
    layer.update(makeState(802));
    const clouds = container.querySelectorAll(".cloud");
    expect(clouds.length).toBe(CLOUD_CONFIGS.medium.count);
    expect(clouds.length).toBeGreaterThan(CLOUD_CONFIGS.light.count);
  });

  it("renders more clouds for 803 (broken) than 802 (scattered)", () => {
    layer.update(makeState(803));
    const clouds = container.querySelectorAll(".cloud");
    expect(clouds.length).toBe(CLOUD_CONFIGS.heavy.count);
    expect(clouds.length).toBeGreaterThan(CLOUD_CONFIGS.medium.count);
  });

  it("renders storm clouds for 804 (overcast), more than 803", () => {
    layer.update(makeState(804));
    const clouds = container.querySelectorAll(".cloud");
    expect(clouds.length).toBe(CLOUD_CONFIGS.storm.count);
    expect(clouds.length).toBeGreaterThan(CLOUD_CONFIGS.heavy.count);
  });

  it("renders rain particles for 501 (moderate rain)", () => {
    layer.update(makeState(501));
    expect(container.querySelector(".droplets")).toBeTruthy();
    expect(container.querySelector(".particle")).toBeTruthy();
    expect(container.querySelectorAll(".cloud").length).toBe(CLOUD_CONFIGS.medium.count);
  });

  it("renders standard lightning for thunderstorm (201)", () => {
    layer.update(makeState(201));
    expect(container.querySelector(".lightning-standard")).toBeTruthy();
    expect(container.querySelector(".droplets")).toBeTruthy();
  });

  it("renders distant lightning for light thunderstorm (210)", () => {
    layer.update(makeState(210));
    expect(container.querySelector(".lightning-distant")).toBeTruthy();
    expect(container.querySelector(".droplets")).toBeFalsy();
    const clouds = container.querySelectorAll(".cloud");
    expect(clouds.length).toBe(CLOUD_CONFIGS.heavy.count);
  });

  it("renders intense lightning for heavy thunderstorm (212)", () => {
    layer.update(makeState(212));
    expect(container.querySelector(".lightning-intense")).toBeTruthy();
    expect(container.querySelector(".lightning-secondary")).toBeTruthy();
    expect(container.querySelector(".atmosphere-lg")).toBeTruthy();
  });

  it("renders storm-density clouds for regular thunderstorm (211)", () => {
    layer.update(makeState(211));
    expect(container.querySelector(".lightning-standard")).toBeTruthy();
    const clouds = container.querySelectorAll(".cloud");
    expect(clouds.length).toBe(CLOUD_CONFIGS.storm.count);
    expect(clouds.length).toBeGreaterThan(CLOUD_CONFIGS.heavy.count);
  });

  it("renders atmosphere layers for mist (701) with wisps", () => {
    layer.update(makeState(701));
    expect(container.querySelector(".atmosphere-lg")).toBeTruthy();
    expect(container.querySelector(".atmosphere-md")).toBeTruthy();
    expect(container.querySelector(".atmosphere-sm")).toBeFalsy();
    expect(container.querySelector(".atmo-particle")).toBeTruthy();
    expect(container.querySelector(".atmo-float")).toBeTruthy();
  });

  it("renders 3 atmosphere layers for fog (741) with fog banks", () => {
    layer.update(makeState(741));
    expect(container.querySelector(".atmosphere-lg")).toBeTruthy();
    expect(container.querySelector(".atmosphere-md")).toBeTruthy();
    expect(container.querySelector(".atmosphere-sm")).toBeTruthy();
    expect(container.querySelector(".atmo-float")).toBeTruthy();
  });

  it("renders atmosphere with correct color for smoke (711)", () => {
    layer.update(makeState(711));
    const el = container.querySelector(".atmosphere-lg") as HTMLElement;
    expect(el.getAttribute("style")).toContain("#8b7355");
    expect(container.querySelector(".atmo-float")).toBeTruthy();
  });

  it("renders swirling particles for dust whirls (731)", () => {
    layer.update(makeState(731));
    expect(container.querySelector(".atmo-swirl")).toBeTruthy();
  });

  it("renders falling particles for volcanic ash (762)", () => {
    layer.update(makeState(762));
    expect(container.querySelector(".atmo-fall")).toBeTruthy();
  });

  it("renders particles for 601 (snow)", () => {
    layer.update(makeState(601));
    expect(container.querySelector(".droplets")).toBeTruthy();
  });

  it("renders dual precipitation for rain+snow (615)", () => {
    layer.update(makeState(615));
    const droplets = container.querySelectorAll(".droplets");
    expect(droplets.length).toBe(2);
  });

  it("renders sleet particles with blue color (611)", () => {
    layer.update(makeState(611));
    const particle = container.querySelector(".particle") as HTMLElement;
    expect(particle.getAttribute("style")).toContain("background:#a0cfff");
  });

  it("renders freezing rain with distinct icy-blue color and ice glint (511)", () => {
    layer.update(makeState(511));
    const particle = container.querySelector(".particle") as HTMLElement;
    expect(particle.getAttribute("style")).toContain("background:#7ec8f0");
    expect(container.querySelector(".atmo-float")).toBeTruthy();
  });

  it("renders wind-driven precipitation for shower rain (521)", () => {
    layer.update(makeState(521));
    const droplets = container.querySelector(".droplets") as HTMLElement;
    expect(droplets.style.animationName).toBe("precipitate-light-wind");
  });

  it("renders strong wind for squalls (771)", () => {
    layer.update(makeState(771));
    const droplets = container.querySelector(".droplets") as HTMLElement;
    expect(droplets.style.animationName).toBe("precipitate-strong-wind");
  });

  it("sets fall speed inline on droplets container", () => {
    layer.update(makeState(501));
    const droplets = container.querySelector(".droplets") as HTMLElement;
    expect(droplets.style.animationDuration).toBe(PRECIP_CONFIG.rain.fallSpeed);
  });

  it("cleans up on destroy", () => {
    layer.update(makeState(501));
    layer.destroy();
    expect(container.innerHTML).toBe("");
  });
});
```

**Step 2: Run tests**

Run: `just app::test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add app/src/scripts/live-window/__tests__/layers/weather.test.ts
git commit -m "test(weather): update tests for new weather effects (wind, atmo particles, lightning variants)"
```

---

### Task 11: Run Full Verification

**Step 1: Run typecheck**

Run: `just app::typecheck`
Expected: PASS

**Step 2: Run all tests**

Run: `just app::test`
Expected: All pass

**Step 3: Run build**

Run: `just app::build`
Expected: PASS

**Step 4: Commit any remaining fixes**

If any step above fails, fix the issue and commit.

---

### Task 12: Export New Configs for Playground Testing

**Files:**
- Modify: `app/src/scripts/live-window/components/sky/WeatherLayer.ts` (ensure `ATMO_PARTICLE_CONFIG` is exported)

**Step 1: Verify all new configs are exported**

Check that the file exports: `PRECIP_CONFIG`, `ATMOSPHERE_CONFIG`, `ATMO_PARTICLE_CONFIG`, `CLOUD_CONFIGS`, `WEATHER_EFFECTS`, and all new types.

**Step 2: Final commit**

```bash
git add -A
git commit -m "chore(weather): ensure all new configs are properly exported"
```
