export function isValidDate(isoString: string): boolean {
  const d = new Date(isoString);
  return !isNaN(d.getTime()) && d.getFullYear() > 1970;
}

export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", { year: "numeric", month: "short" });
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
