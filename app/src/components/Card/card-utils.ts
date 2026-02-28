import { categoryDisplay } from "@lib/nav-data";

export { categoryDisplay };

export const PLACEHOLDER_COLORS = [
  "#39FF14" /* neon green */,
  "#00E5A0" /* teal */,
  "#00D4AA" /* mint */,
  "#0A8F6F" /* deep teal */,
  "#2B9F4B" /* forest green */,
  "#1CB5A0" /* sea green */,
];

export function pickColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PLACEHOLDER_COLORS[Math.abs(hash) % PLACEHOLDER_COLORS.length];
}

export function tileSvg(title: string): string {
  const label = title.toUpperCase() + " ";
  const escaped = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const charW = 6.8;
  const w = Math.ceil(label.length * charW);
  const h = 34;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<text x="0" y="12" font-family="sans-serif" font-weight="700" font-size="10" letter-spacing="0.6" fill="rgba(3,10,18,0.18)">${escaped}</text>` +
    `<text x="${Math.round(w / 2)}" y="29" font-family="sans-serif" font-weight="700" font-size="10" letter-spacing="0.6" fill="rgba(3,10,18,0.18)">${escaped}</text>` +
    `<text x="${Math.round(-w / 2)}" y="29" font-family="sans-serif" font-weight="700" font-size="10" letter-spacing="0.6" fill="rgba(3,10,18,0.18)">${escaped}</text>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
