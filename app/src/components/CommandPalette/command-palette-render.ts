import { categoryDisplay, formatDate } from "@lib/format-utils";
import type { SearchItem } from "./command-palette-search";

type SlotFn = (name: string) => HTMLElement;

export function populateMeta(slot: SlotFn, collectionLabel: string, catDisplay: string): void {
  if (!collectionLabel && !catDisplay) return;
  slot("meta").hidden = false;
  if (collectionLabel) slot("collection").textContent = collectionLabel;
  if (catDisplay) slot("category").textContent = catDisplay;
  if (collectionLabel && catDisplay) slot("meta-sep").hidden = false;
}

export function renderItem(
  item: SearchItem,
  idx: number,
  showCollection: boolean,
  cpRowTpl: HTMLTemplateElement,
  cpRowExternalTpl: HTMLTemplateElement,
): DocumentFragment {
  const isExternal = item.collection === "links";
  const href = isExternal ? item.id : `/${item.collection}/post/${item.id}`;
  const tpl = isExternal ? cpRowExternalTpl : cpRowTpl;

  const frag = tpl.content.cloneNode(true) as DocumentFragment;
  const root = frag.firstElementChild as HTMLAnchorElement;
  const slot: SlotFn = (name) => root.querySelector(`[data-cp="${name}"]`) as HTMLElement;

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
