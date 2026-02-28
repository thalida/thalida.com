interface SearchItem {
  id: string;
  collection: string;
  collectionTitle: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  coverImageSrc?: string;
  publishedOn: string;
  faviconUrl?: string;
}

interface NavCollectionData {
  title: string;
  items: SearchItem[];
}

declare global {
  interface Window {
    __cpData: { allItems: SearchItem[]; navData: Record<string, NavCollectionData> };
  }
}

const MAX_PALETTE_RESULTS = 15;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Pagefind has no published type declarations
let pagefind: any = null;

async function loadPagefind() {
  if (pagefind) return pagefind;
  try {
    // Use string concatenation to prevent Vite/Rollup from resolving this at build time.
    // Pagefind assets are generated post-build by astro-pagefind.
    const path = "/pagefind/pagefind.js";
    pagefind = await import(/* @vite-ignore */ path);
    await pagefind.init();
  } catch {
    pagefind = null;
  }
  return pagefind;
}

function initCommandPalette() {
  const overlay = document.getElementById("command-palette");
  const input = document.getElementById("js-cp-input") as HTMLInputElement | null;
  const resultsContainer = document.getElementById("cp-results");
  const collectionSelect = document.getElementById("js-cp-collection-select") as HTMLSelectElement | null;

  if (!overlay || !input || !resultsContainer || !collectionSelect) return;

  const backdrop = document.getElementById("js-cp-backdrop");
  const dialog = document.getElementById("js-cp-dialog");

  if (!backdrop || !dialog) return;

  const data = window.__cpData;
  const itemLookup = new Map<string, SearchItem>();
  for (const item of data.allItems) {
    itemLookup.set(`${item.collection}/${item.id}`, item);
  }
  let selectedIndex = -1;

  function getActiveCollectionFromPage() {
    const nav = document.getElementById("site-nav");
    const col = nav?.dataset?.activeCollection;
    return col && col.length > 0 ? col : null;
  }

  function open() {
    const pageCollection = getActiveCollectionFromPage();

    if (pageCollection && data.navData[pageCollection]) {
      collectionSelect.value = pageCollection;
    } else {
      collectionSelect.value = "";
    }

    input.value = "";
    selectedIndex = -1;
    overlay.setAttribute("aria-hidden", "false");
    overlay.classList.remove("hidden");
    overlay.classList.add("cp-overlay--open");
    input.focus();
    renderResults("");
  }

  function close() {
    overlay.setAttribute("aria-hidden", "true");
    overlay.classList.remove("cp-overlay--open");
    overlay.classList.add("hidden");
    input.value = "";
    selectedIndex = -1;
  }

  function isOpen() {
    return overlay.classList.contains("cp-overlay--open");
  }

  function getActiveCollection() {
    return collectionSelect.value || null;
  }

  function stringMatch(pool: SearchItem[], query: string): SearchItem[] {
    const q = query.toLowerCase();
    return pool.filter((item: SearchItem) => {
      return (
        item.title.toLowerCase().includes(q) ||
        (item.description ?? "").toLowerCase().includes(q) ||
        (item.tags ?? []).some((t: string) => t.toLowerCase().includes(q)) ||
        (item.category ?? "").toLowerCase().includes(q)
      );
    });
  }

  async function getFiltered(query: string): Promise<SearchItem[]> {
    let pool = data.allItems;
    const activeCollection = getActiveCollection();

    if (activeCollection) {
      pool = pool.filter((item: SearchItem) => item.collection === activeCollection);
    }

    if (!query.trim()) return pool.slice(0, MAX_PALETTE_RESULTS);

    const pf = await loadPagefind();

    if (!pf) {
      // Pagefind unavailable — fall back to string matching for everything
      return stringMatch(pool, query).slice(0, MAX_PALETTE_RESULTS);
    }

    // Pagefind search for content pages (not links)
    const pfResults: SearchItem[] = [];
    try {
      const search = await pf.search(query);
      for (const result of search.results) {
        const resultData = await result.data();
        const collection = resultData.meta?.collection;
        const itemId = resultData.meta?.itemId;
        if (!collection || !itemId) continue;
        if (activeCollection && collection !== activeCollection) continue;
        const item = itemLookup.get(`${collection}/${itemId}`);
        if (item) pfResults.push(item);
        if (pfResults.length >= MAX_PALETTE_RESULTS) break;
      }
    } catch {
      // Pagefind search failed — fall back to string matching
      return stringMatch(pool, query).slice(0, MAX_PALETTE_RESULTS);
    }

    // String matching for links (Pagefind can't index them — no detail pages)
    const linksPool = pool.filter((item: SearchItem) => item.collection === "links");
    const linkMatches = stringMatch(linksPool, query);

    // Merge: Pagefind results first (ranked by relevance), then link matches
    const seen = new Set<string>(pfResults.map((item) => `${item.collection}/${item.id}`));
    const merged = [...pfResults];
    for (const item of linkMatches) {
      const key = `${item.collection}/${item.id}`;
      if (!seen.has(key)) {
        merged.push(item);
        seen.add(key);
      }
      if (merged.length >= MAX_PALETTE_RESULTS) break;
    }

    return merged.slice(0, MAX_PALETTE_RESULTS);
  }

  function renderItem(item: SearchItem, idx: number, showCollection: boolean) {
    const isExternal = item.collection === "links";
    const href = isExternal ? item.id : `/${item.collection}/${item.id}`;
    const target = isExternal ? ' target="_blank" rel="noopener"' : "";

    const collectionLabel = showCollection ? escapeHtml(item.collectionTitle) : "";
    const catDisplay = item.category
      ? item.category
          .split("-")
          .map((p: string) => (p !== "and" ? p.charAt(0).toUpperCase() + p.slice(1) : p))
          .join(" ")
      : "";

    let metaLine = "";
    if (showCollection && catDisplay) {
      metaLine = `<span class="text-2xs text-muted">${collectionLabel} <span class="text-muted/50">·</span> <span class="text-neon">${escapeHtml(catDisplay)}</span></span>`;
    } else if (showCollection) {
      metaLine = `<span class="text-2xs text-muted">${collectionLabel}</span>`;
    } else if (catDisplay) {
      metaLine = `<span class="text-2xs text-neon uppercase tracking-widest">${escapeHtml(catDisplay)}</span>`;
    }

    if (isExternal) {
      const domain = (() => {
        try {
          return new URL(item.id).hostname.replace(/^www\./, "");
        } catch {
          return item.id;
        }
      })();
      const favicon = item.faviconUrl
        ? `<img class="w-4 h-4 rounded-sm shrink-0" src="${item.faviconUrl}" alt="" />`
        : `<div class="w-4 h-4 rounded-sm shrink-0 bg-midnight flex items-center justify-center text-2xs font-semibold uppercase font-display border border-border"><span class="cp-row__initial">${escapeHtml(item.title.charAt(0))}</span></div>`;

      return `<a href="${href}"${target} class="cp-row flex items-center gap-3 py-2 px-3 rounded-md no-underline text-muted transition-colors hover:bg-midnight hover:text-text" data-index="${idx}">
        <div class="w-8 h-8 rounded shrink-0 bg-midnight flex items-center justify-center border border-border">
          ${favicon}
        </div>
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
          ${metaLine ? `<div>${metaLine}</div>` : ""}
          <span class="cp-row__title text-sm font-heading font-medium truncate text-text">${escapeHtml(item.title)}</span>
          <span class="cp-row__domain text-2xs text-muted flex items-center gap-1">${escapeHtml(domain)} <svg class="text-muted opacity-60" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></span>
        </div>
      </a>`;
    }

    return `<a href="${href}"${target} class="cp-row flex items-center justify-between gap-3 py-2 px-3 rounded-md no-underline text-muted transition-colors hover:bg-midnight hover:text-text" data-index="${idx}">
      ${
        item.coverImageSrc
          ? `<img class="w-8 h-8 rounded object-cover shrink-0 bg-midnight" src="${item.coverImageSrc}" alt="" />`
          : `<div class="cp-row__img--empty w-8 h-8 rounded shrink-0 bg-midnight flex items-center justify-center text-xs font-semibold uppercase font-display border border-border"><span>${escapeHtml(item.title.charAt(0))}</span></div>`
      }
      <div class="flex-1 min-w-0 flex flex-col gap-0.5">
        ${metaLine ? `<div>${metaLine}</div>` : ""}
        <span class="cp-row__title text-sm font-heading font-medium truncate text-text">${escapeHtml(item.title)}</span>
      </div>
      <span class="text-xs text-muted shrink-0">${formatDateClient(item.publishedOn)}</span>
    </a>`;
  }

  async function renderResults(query: string) {
    const filtered = await getFiltered(query);
    const activeCollection = getActiveCollection();
    selectedIndex = -1;

    if (filtered.length === 0) {
      resultsContainer.innerHTML = '<div class="py-8 px-4 text-center text-muted text-sm">No results found</div>';
      return;
    }

    const showCollection = !activeCollection;
    resultsContainer.innerHTML = filtered
      .map((item: SearchItem, i: number) => renderItem(item, i, showCollection))
      .join("");
  }

  function updateSelection() {
    const items = resultsContainer.querySelectorAll(".cp-row");
    items.forEach((el, i) => {
      el.classList.toggle("cp-row--selected", i === selectedIndex);
      if (i === selectedIndex) el.scrollIntoView({ block: "nearest" });
    });
  }

  function escapeHtml(str: string) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function formatDateClient(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short" });
  }

  // Input handlers
  input.addEventListener("input", () => renderResults(input.value));

  // Collection select change
  collectionSelect.addEventListener("change", () => {
    renderResults(input.value);
    input.focus();
  });

  input.addEventListener("keydown", (e) => {
    const items = resultsContainer.querySelectorAll(".cp-row");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      updateSelection();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateSelection();
    } else if (e.key === "Enter" && selectedIndex >= 0 && items[selectedIndex]) {
      e.preventDefault();
      close();
      (items[selectedIndex] as HTMLAnchorElement).click();
    } else if (e.key === "Escape") {
      close();
    }
  });

  // Close on backdrop click
  backdrop.addEventListener("click", close);

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      if (isOpen()) {
        close();
      } else {
        open();
      }
    }
  });

  // Sidebar search button click (multiple instances due to responsive layout)
  document.querySelectorAll("#js-nav-search-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!isOpen()) {
        open();
      }
    });
  });

  // Toolbar search button click
  const tabletSearchBtn = document.getElementById("toolbar-search-btn");
  if (tabletSearchBtn) {
    tabletSearchBtn.addEventListener("click", () => {
      if (!isOpen()) {
        open();
      }
    });
  }
}

document.addEventListener("astro:page-load", initCommandPalette);
