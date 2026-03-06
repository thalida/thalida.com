import type { SearchItem, NavCollectionData } from "./command-palette-search";
import { getFiltered } from "./command-palette-search";
import { renderItem } from "./command-palette-render";

declare global {
  interface Window {
    __cpData: { allItems: SearchItem[]; navData: Record<string, NavCollectionData> };
  }
}

let cpAC: AbortController | null = null;

function initCommandPalette() {
  cpAC?.abort();
  cpAC = new AbortController();
  const { signal } = cpAC;

  const overlay = document.querySelector('[data-cp="overlay"]') as HTMLElement;
  const input = document.querySelector('[data-cp="input"]') as HTMLInputElement;
  const resultsContainer = document.querySelector('[data-cp="results"]') as HTMLElement;
  const collectionSelect = document.querySelector('[data-cp="collection-select"]') as HTMLSelectElement;

  if (!overlay || !input || !resultsContainer || !collectionSelect) return;

  const backdrop = document.querySelector<HTMLElement>('[data-cp="backdrop"]');
  const cpRowTpl = document.querySelector('[data-cp="row-tpl"]') as HTMLTemplateElement;
  const cpRowExternalTpl = document.querySelector('[data-cp="row-external-tpl"]') as HTMLTemplateElement;
  const cpEmptyTpl = document.querySelector('[data-cp="empty-tpl"]') as HTMLTemplateElement;

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

  async function renderResults(query: string) {
    const activeCollection = collectionSelect.value || null;
    const filtered = await getFiltered(data.allItems, itemLookup, activeCollection, query);
    selectedIndex = -1;
    resultsContainer.innerHTML = "";

    if (filtered.length === 0) {
      resultsContainer.appendChild(cpEmptyTpl.content.cloneNode(true));
      return;
    }

    const showCollection = !activeCollection;
    const batch = document.createDocumentFragment();
    filtered.forEach((item, i) => {
      batch.appendChild(renderItem(item, i, showCollection, cpRowTpl, cpRowExternalTpl));
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
  input.addEventListener("input", () => renderResults(input.value), { signal });

  // Collection select change
  collectionSelect.addEventListener(
    "change",
    () => {
      renderResults(input.value);
      input.focus();
    },
    { signal },
  );

  input.addEventListener(
    "keydown",
    (e) => {
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
    },
    { signal },
  );

  // Close on backdrop click
  backdrop?.addEventListener("click", close, { signal });

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  document.addEventListener(
    "keydown",
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen()) {
          close();
        } else {
          open();
        }
      }
    },
    { signal },
  );

  // Sidebar search button click (multiple instances due to responsive layout)
  document.querySelectorAll('[data-nav="search-btn"]').forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        if (!isOpen()) {
          open();
        }
      },
      { signal },
    );
  });

  // Toolbar search button click
  const tabletSearchBtn = document.querySelector<HTMLElement>('[data-layout="search-btn"]');
  if (tabletSearchBtn) {
    tabletSearchBtn.addEventListener(
      "click",
      () => {
        if (!isOpen()) {
          open();
        }
      },
      { signal },
    );
  }
}

document.addEventListener("astro:page-load", initCommandPalette);

export {};
