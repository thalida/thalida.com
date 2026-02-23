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

function initCommandPalette() {
  const overlay = document.getElementById("command-palette");
  const input = document.getElementById("cp-input") as HTMLInputElement | null;
  const resultsContainer = document.getElementById("cp-results");
  const collectionSelect = document.getElementById("cp-collection-select") as HTMLSelectElement | null;

  if (!overlay || !input || !resultsContainer || !collectionSelect) return;

  const backdrop = overlay.querySelector(".cp-backdrop");
  const dialog = overlay.querySelector(".cp-dialog");

  if (!backdrop || !dialog) return;

  const data = window.__cpData;
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
    overlay.classList.add("cp-overlay--open");
    input.focus();
    renderResults("");
  }

  function close() {
    overlay.setAttribute("aria-hidden", "true");
    overlay.classList.remove("cp-overlay--open");
    input.value = "";
    selectedIndex = -1;
  }

  function isOpen() {
    return overlay.classList.contains("cp-overlay--open");
  }

  function getActiveCollection() {
    return collectionSelect.value || null;
  }

  function getFiltered(query: string) {
    let pool = data.allItems;
    const activeCollection = getActiveCollection();

    if (activeCollection) {
      pool = pool.filter((item: SearchItem) => item.collection === activeCollection);
    }

    if (!query.trim()) return pool.slice(0, MAX_PALETTE_RESULTS);

    const q = query.toLowerCase();
    return pool
      .filter((item: SearchItem) => {
        return (
          item.title.toLowerCase().includes(q) ||
          (item.description ?? "").toLowerCase().includes(q) ||
          (item.tags ?? []).some((t: string) => t.toLowerCase().includes(q)) ||
          (item.category ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, MAX_PALETTE_RESULTS);
  }

  function renderResults(query: string) {
    const filtered = getFiltered(query);
    const activeCollection = getActiveCollection();
    selectedIndex = -1;

    if (filtered.length === 0) {
      resultsContainer.innerHTML = '<div class="cp-empty">No results found</div>';
      return;
    }

    function renderTags(tags: string[]) {
      if (!tags || tags.length === 0) return "";
      const displayTags = tags.slice(0, 2);
      const extra = tags.length > 2 ? `<span class="cp-row__tag">+${tags.length - 2}</span>` : "";
      return `<div class="cp-row__tags">${displayTags.map((t) => `<span class="cp-row__tag">${escapeHtml(t)}</span>`).join("")}${extra}</div>`;
    }

    function renderItem(item: SearchItem, idx: number) {
      const isExternal = item.collection === "links";
      const href = isExternal ? item.id : `/${item.collection}/${item.id}`;
      const target = isExternal ? ' target="_blank" rel="noopener"' : "";
      return `<a href="${href}"${target} class="cp-row" data-index="${idx}">
          ${
            item.coverImageSrc
              ? `<img class="cp-row__img" src="${item.coverImageSrc}" alt="" />`
              : `<div class="cp-row__img cp-row__img--empty"><span>${escapeHtml(item.title.charAt(0))}</span></div>`
          }
          <div class="cp-row__content">
            <span class="cp-row__title">${escapeHtml(item.title)}</span>
            ${renderTags(item.tags ?? [])}
          </div>
          ${!isExternal ? `<span class="cp-row__meta">${formatDateClient(item.publishedOn)}</span>` : ""}
        </a>`;
    }

    if (activeCollection) {
      resultsContainer.innerHTML = filtered.map((item: SearchItem, i: number) => renderItem(item, i)).join("");
    } else {
      const grouped: Record<string, SearchItem[]> = {};
      for (const item of filtered) {
        (grouped[item.collection] ??= []).push(item);
      }
      let idx = 0;
      let html = "";
      for (const [col, items] of Object.entries(grouped)) {
        const title = items[0]?.collectionTitle ?? col;
        html += `<div class="cp-group-label">${escapeHtml(title)}</div>`;
        for (const item of items) {
          html += renderItem(item, idx);
          idx++;
        }
      }
      resultsContainer.innerHTML = html;
    }
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

  // Sidebar search button click
  const navSearchBtn = document.getElementById("nav-search-btn");
  if (navSearchBtn) {
    navSearchBtn.addEventListener("click", () => {
      if (!isOpen()) {
        open();
      }
    });
  }

  // Tablet search button click
  const tabletSearchBtn = document.getElementById("tablet-search-btn");
  if (tabletSearchBtn) {
    tabletSearchBtn.addEventListener("click", () => {
      if (!isOpen()) {
        open();
      }
    });
  }
}

document.addEventListener("astro:page-load", initCommandPalette);
