---
title: Public Live Window Playground Implementation Plan
description: Make the live window playground public at
  `/playground/live-window`, merge dev test cities into it, add Nominatim city
  search, and link from the home page.
publishedOn: 2026-03-07T17:42:57.000Z
tags:
  - implementation
---

# Public Live Window Playground Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the live window playground public at `/playground/live-window`, merge dev test cities into it, add Nominatim city search, and link from the home page.

**Architecture:** Move the existing dev playground page to a new `/playground/` route, remove the prod guard, add all 10 cities as presets, replace the custom coordinate inputs with a city search field (Nominatim geocoding), and add a subtle link on the home page hero section.

**Tech Stack:** Astro, TypeScript, Nominatim OpenStreetMap API (client-side fetch)

---

### Task 1: Create the public playground page

**Files:**
- Create: `app/src/pages/playground/live-window.astro`

**Step 1: Create the playground directory and page**

Copy the content from `app/src/pages/dev/live-window-playground.astro` to `app/src/pages/playground/live-window.astro` with these changes:

1. Remove the prod redirect guard (lines 5-7: `if (import.meta.env.PROD) { return Astro.redirect("/404"); }`)
2. Update the script import path from `../../scripts/live-window/LiveWindow.ts` to `../../scripts/live-window/LiveWindow.ts` (same relative depth, no change needed)
3. Update the `@reference` path in the style block from `../../layouts/BaseLayout/BaseLayout.css` to `../../layouts/BaseLayout/BaseLayout.css` (same relative depth, no change needed)
4. Add `title` and `description` props to `BaseLayout` for SEO
5. Merge the city presets — add Mumbai and São Paulo from the test page to the location select, keeping all existing presets

The location select should contain these 10 presets (union of playground + test page cities):
```html
<option value="">Auto (IP-based)</option>
<option value="40.7128,-74.0060" data-tz="America/New_York">New York, US</option>
<option value="51.5074,-0.1278" data-tz="Europe/London">London, UK</option>
<option value="35.6762,139.6503" data-tz="Asia/Tokyo">Tokyo, JP</option>
<option value="-33.8688,151.2093" data-tz="Australia/Sydney">Sydney, AU</option>
<option value="64.1466,-21.9426" data-tz="Atlantic/Reykjavik">Reykjavik, IS</option>
<option value="1.3521,103.8198" data-tz="Asia/Singapore">Singapore, SG</option>
<option value="-22.9068,-43.1729" data-tz="America/Sao_Paulo">Rio de Janeiro, BR</option>
<option value="30.0444,31.2357" data-tz="Africa/Cairo">Cairo, EG</option>
<option value="19.076,72.8777" data-tz="Asia/Kolkata">Mumbai, IN</option>
<option value="-23.5505,-46.6333" data-tz="America/Sao_Paulo">São Paulo, BR</option>
<option value="custom">Custom...</option>
```

**Step 2: Verify the page builds**

Run: `just app::build`
Expected: Build succeeds, `/playground/live-window` route is generated

**Step 3: Commit**

```bash
git add app/src/pages/playground/live-window.astro
git commit -m "feat: create public live window playground at /playground/live-window"
```

---

### Task 2: Add city search with Nominatim geocoding

**Files:**
- Modify: `app/src/pages/playground/live-window.astro`

**Step 1: Add the city search UI**

In the Location fieldset, add a city search input above the preset select. Replace the existing custom coords section with a search-first approach:

```html
<fieldset class="control-group">
  <legend>Location</legend>
  <div class="control-row">
    <label for="location-select">Preset</label>
    <select id="location-select">
      <!-- all 10 presets + Auto + Custom -->
    </select>
  </div>
  <div id="city-search-section" class="city-search-section" hidden>
    <div class="control-row">
      <label for="city-search-input">Search city</label>
      <div class="search-wrapper">
        <input type="text" id="city-search-input" placeholder="Type a city name..." autocomplete="off" />
        <ul id="city-search-results" class="search-results" hidden></ul>
      </div>
    </div>
    <div class="control-row">
      <label>Coordinates</label>
      <span id="custom-coords-display" class="coords-display">—</span>
    </div>
    <details class="manual-coords-details">
      <summary>Enter coordinates manually</summary>
      <div class="control-row">
        <label for="lat-input">Latitude</label>
        <input type="number" id="lat-input" step="0.0001" min="-90" max="90" placeholder="40.7128" />
      </div>
      <div class="control-row">
        <label for="lng-input">Longitude</label>
        <input type="number" id="lng-input" step="0.0001" min="-180" max="180" placeholder="-74.0060" />
      </div>
      <div class="control-row">
        <label for="tz-input">Timezone (IANA)</label>
        <input type="text" id="tz-input" placeholder="America/New_York" />
      </div>
    </details>
  </div>
</fieldset>
```

**Step 2: Add the Nominatim search script**

In the `<script>` block, add the city search logic. Key behavior:
- When location select is set to "Custom...", show the `city-search-section`
- Debounce input by 300ms
- Fetch from `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=5&addressdetails=1`
- Use `fetch` with header `{ 'User-Agent': 'thalida.com-playground' }` — note: browsers may strip this header, but Nominatim also accepts it via query param `email` as an alternative. We'll include it as best-effort.
- Show results in `<ul>` dropdown
- On result click: set lat/lng/timezone on the live-window, update the coords display, close the dropdown
- Timezone lookup: Nominatim doesn't return timezone. Use the `Intl.DateTimeFormat().resolvedOptions().timeZone` approach — actually, we can't determine timezone from lat/lng client-side without a library. Instead, leave the timezone field blank (the live-window API can resolve it), or let users set it manually if needed.

```typescript
// City search
const citySearchSection = document.getElementById("city-search-section") as HTMLDivElement;
const citySearchInput = document.getElementById("city-search-input") as HTMLInputElement;
const citySearchResults = document.getElementById("city-search-results") as HTMLUListElement;
const coordsDisplay = document.getElementById("custom-coords-display") as HTMLSpanElement;

let searchTimeout: ReturnType<typeof setTimeout>;

citySearchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  const query = citySearchInput.value.trim();
  if (query.length < 2) {
    citySearchResults.hidden = true;
    return;
  }
  searchTimeout = setTimeout(() => searchCity(query), 300);
});

async function searchCity(query: string) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
    const res = await fetch(url);
    const results = await res.json();
    renderSearchResults(results);
  } catch {
    citySearchResults.innerHTML = '<li class="search-result-item search-result-error">Search failed</li>';
    citySearchResults.hidden = false;
  }
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

function renderSearchResults(results: NominatimResult[]) {
  if (results.length === 0) {
    citySearchResults.innerHTML = '<li class="search-result-item search-result-empty">No results found</li>';
    citySearchResults.hidden = false;
    return;
  }

  citySearchResults.innerHTML = results
    .map((r) => {
      const name = r.address?.city || r.address?.town || r.address?.village || r.display_name.split(",")[0];
      const country = r.address?.country || "";
      const label = country ? `${name}, ${country}` : name;
      return `<li class="search-result-item" data-lat="${r.lat}" data-lng="${r.lon}" data-label="${label}">${label}<span class="search-result-coords">${parseFloat(r.lat).toFixed(4)}, ${parseFloat(r.lon).toFixed(4)}</span></li>`;
    })
    .join("");
  citySearchResults.hidden = false;
}

citySearchResults.addEventListener("click", (e) => {
  const item = (e.target as HTMLElement).closest("[data-lat]") as HTMLElement | null;
  if (!item) return;
  const lat = item.dataset.lat!;
  const lng = item.dataset.lng!;
  const label = item.dataset.label!;

  win.setAttribute("latitude", lat);
  win.setAttribute("longitude", lng);
  win.setAttribute("label", label);
  win.removeAttribute("timezone"); // let API resolve it

  coordsDisplay.textContent = `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`;
  citySearchInput.value = label;
  citySearchResults.hidden = true;

  // Also update manual coord fields
  latInput.value = lat;
  lngInput.value = lng;
  tzInput.value = "";
});

// Close search results when clicking outside
document.addEventListener("click", (e) => {
  if (!(e.target as HTMLElement).closest(".search-wrapper")) {
    citySearchResults.hidden = true;
  }
});
```

**Step 3: Update the `updateLocation` function**

Modify the existing `updateLocation` function so that when "Custom..." is selected, it shows `city-search-section` instead of the old `custom-coords` div:

```typescript
function updateLocation() {
  const value = locationSelect.value;
  const option = locationSelect.selectedOptions[0];

  if (value === "") {
    win.removeAttribute("latitude");
    win.removeAttribute("longitude");
    win.removeAttribute("timezone");
    win.removeAttribute("label");
    citySearchSection.hidden = true;
  } else if (value === "custom") {
    citySearchSection.hidden = false;
    win.removeAttribute("label");
    applyCustomCoords();
  } else {
    citySearchSection.hidden = true;
    const [lat, lng] = value.split(",");
    const tz = option?.dataset.tz ?? null;
    const label = option?.textContent?.trim() ?? null;
    win.setAttribute("latitude", lat);
    win.setAttribute("longitude", lng);
    if (tz) win.setAttribute("timezone", tz);
    else win.removeAttribute("timezone");
    if (label) win.setAttribute("label", label);
    else win.removeAttribute("label");
  }
}
```

**Step 4: Add CSS for the search UI**

```css
.city-search-section {
  margin-top: 0.75rem;
}

.search-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
}

.search-wrapper input[type="text"] {
  width: 100%;
  box-sizing: border-box;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  list-style: none;
  margin: 0;
  padding: 0;
  background: var(--color-surface, #0d1b2a);
  border: 1px solid var(--color-midnight-light, #1a2a3a);
  border-top: none;
  border-radius: 0 0 0.25rem 0.25rem;
  max-height: 200px;
  overflow-y: auto;
}

.search-result-item {
  padding: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.search-result-item:hover {
  background: var(--color-midnight-light, #1a2a3a);
}

.search-result-empty,
.search-result-error {
  cursor: default;
  color: var(--color-muted);
  font-style: italic;
}

.search-result-coords {
  font-family: var(--font-mono, monospace);
  font-size: 0.625rem;
  color: var(--color-muted);
}

.coords-display {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  color: var(--color-muted);
}

.manual-coords-details {
  margin-top: 0.75rem;
}

.manual-coords-details summary {
  font-size: 0.625rem;
  color: var(--color-muted);
  cursor: pointer;
  margin-bottom: 0.5rem;
}

.manual-coords-details summary:hover {
  color: var(--color-text);
}
```

**Step 5: Update the reset function**

In the reset handler, also clear the city search:
```typescript
// Reset city search
citySearchInput.value = "";
citySearchResults.hidden = true;
coordsDisplay.textContent = "—";
```

**Step 6: Verify the page builds**

Run: `just app::build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add app/src/pages/playground/live-window.astro
git commit -m "feat: add Nominatim city search to live window playground"
```

---

### Task 3: Add home page link to playground

**Files:**
- Modify: `app/src/pages/index.astro`

**Step 1: Add the playground link**

After the `<live-window>` element on line 26, add a subtle link:

```html
<live-window api-url={apiBaseUrl} theme="dark" bg-color="#030a12"></live-window>
<a href="/playground/live-window" class="playground-link font-body text-2xs text-muted hover:text-teal no-underline mt-2">
  Experiment with Live Window &rarr;
</a>
```

**Step 2: Verify the page builds**

Run: `just app::build`
Expected: Build succeeds, link visible below live window

**Step 3: Commit**

```bash
git add app/src/pages/index.astro
git commit -m "feat: add playground link below live window on home page"
```

---

### Task 4: Remove old dev pages

**Files:**
- Delete: `app/src/pages/dev/live-window-playground.astro`
- Delete: `app/src/pages/dev/live-window-test.astro`
- Delete: `app/src/pages/dev/` (directory, if empty)

**Step 1: Delete the dev pages and directory**

```bash
rm app/src/pages/dev/live-window-playground.astro
rm app/src/pages/dev/live-window-test.astro
rmdir app/src/pages/dev
```

**Step 2: Verify the build still works**

Run: `just app::build`
Expected: Build succeeds with no broken references

**Step 3: Commit**

```bash
git commit -am "chore: remove dev-only live window pages"
```

---

### Task 5: Final verification

**Step 1: Run the full build**

Run: `just app::build`
Expected: Clean build with no errors or warnings

**Step 2: Run type checking**

Run: `just app::typecheck`
Expected: No type errors

**Step 3: Run tests**

Run: `just test`
Expected: All tests pass
