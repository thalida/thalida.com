import { categoryDisplay, formatDate } from "@lib/format-utils";

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
  const overlay = document.querySelector('[data-cp="overlay"]') as HTMLElement;
  const input = document.querySelector('[data-cp="input"]') as HTMLInputElement;
  const resultsContainer = document.querySelector('[data-cp="results"]') as HTMLElement;
  const collectionSelect = document.querySelector('[data-cp="collection-select"]') as HTMLSelectElement;

  if (!overlay || !input || !resultsContainer || !collectionSelect) return;

  const backdrop = document.querySelector<HTMLElement>('[data-cp="backdrop"]');

  const data = window.__cpData;
  const itemLookup = new Map<string, SearchItem>();
  for (const item of data.allItems) {
    itemLookup.set(`${item.collection}/${item.id}`, item);
  }
  let selectedIndex = -1;

  function getActiveCollectionFromPage() {
    const nav = document.querySelector<HTMLElement>('[data-nav="root"]');
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

  const cpRowTpl = document.querySelector('[data-cp="row-tpl"]') as HTMLTemplateElement;
  const cpRowExternalTpl = document.querySelector('[data-cp="row-external-tpl"]') as HTMLTemplateElement;
  const cpEmptyTpl = document.querySelector('[data-cp="empty-tpl"]') as HTMLTemplateElement;

  function populateMeta(slot: (name: string) => HTMLElement, collectionLabel: string, catDisplay: string) {
    if (!collectionLabel && !catDisplay) return;
    slot("meta").hidden = false;
    if (collectionLabel) slot("collection").textContent = collectionLabel;
    if (catDisplay) slot("category").textContent = catDisplay;
    if (collectionLabel && catDisplay) slot("meta-sep").hidden = false;
  }

  function renderItem(item: SearchItem, idx: number, showCollection: boolean): DocumentFragment {
    const isExternal = item.collection === "links";
    const href = isExternal ? item.id : `/${item.collection}/post/${item.id}`;
    const tpl = isExternal ? cpRowExternalTpl : cpRowTpl;

    const frag = tpl.content.cloneNode(true) as DocumentFragment;
    const root = frag.firstElementChild as HTMLAnchorElement;
    const slot = (name: string) => root.querySelector(`[data-cp="${name}"]`) as HTMLElement;

    root.href = href;
    root.dataset.index = String(idx);

    const collectionLabel = showCollection ? item.collectionTitle : "";
    const catDisplay = item.category ? categoryDisplay(item.category) : "";
    populateMeta(slot, collectionLabel, catDisplay);

    slot("title").textContent = item.title;

    if (isExternal) {
      let domain: string;
      try {
        domain = new URL(item.id).hostname.replace(/^www\./, "");
      } catch {
        domain = item.id;
      }
      slot("domain").textContent = domain;

      if (item.faviconUrl) {
        const img = slot("favicon-img") as HTMLImageElement;
        img.src = item.faviconUrl;
        img.hidden = false;
      } else {
        slot("favicon-placeholder").hidden = false;
        slot("initial").textContent = item.title.charAt(0);
      }
    } else {
      if (item.coverImageSrc) {
        const img = slot("cover-img") as HTMLImageElement;
        img.src = item.coverImageSrc;
        img.hidden = false;
      } else {
        slot("cover-placeholder").hidden = false;
        slot("initial").textContent = item.title.charAt(0);
      }
      slot("date").textContent = formatDate(item.publishedOn);
    }

    return frag;
  }

  async function renderResults(query: string) {
    const filtered = await getFiltered(query);
    const activeCollection = getActiveCollection();
    selectedIndex = -1;
    resultsContainer.innerHTML = "";

    if (filtered.length === 0) {
      resultsContainer.appendChild(cpEmptyTpl.content.cloneNode(true));
      return;
    }

    const showCollection = !activeCollection;
    const batch = document.createDocumentFragment();
    filtered.forEach((item: SearchItem, i: number) => {
      batch.appendChild(renderItem(item, i, showCollection));
    });
    resultsContainer.appendChild(batch);
  }

  function updateSelection() {
    const items = resultsContainer.querySelectorAll(".cp-row");
    items.forEach((el, i) => {
      el.classList.toggle("cp-row--selected", i === selectedIndex);
      if (i === selectedIndex) el.scrollIntoView({ block: "nearest" });
    });
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
  backdrop?.addEventListener("click", close);

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
  document.querySelectorAll('[data-nav="search-btn"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!isOpen()) {
        open();
      }
    });
  });

  // Toolbar search button click
  const tabletSearchBtn = document.querySelector<HTMLElement>('[data-layout="search-btn"]');
  if (tabletSearchBtn) {
    tabletSearchBtn.addEventListener("click", () => {
      if (!isOpen()) {
        open();
      }
    });
  }
}

document.addEventListener("astro:page-load", initCommandPalette);

export {};
