export function isValidDate(isoString: string): boolean {
  const d = new Date(isoString);
  return !isNaN(d.getTime()) && d.getFullYear() > 1970;
}

/** Frontmatter dates are authored as bare UTC days, so render them in UTC —
 *  otherwise a visitor west of UTC sees the day (and sometimes month) before. */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", { year: "numeric", month: "short", timeZone: "UTC" });
}

/** "Nov 6, 2021" — the compact form used where horizontal room is tight. */
export function formatShortDate(isoString: string | Date): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatLongDate(isoString: string | Date): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateFull(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export function prettifySlug(categoryName: string): string {
  const parts = categoryName.split("-");
  return parts.map((part) => (part !== "and" ? part.charAt(0).toUpperCase() + part.slice(1) : part)).join(" ");
}
