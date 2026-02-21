function initNav() {
  const siteNav = document.getElementById("site-nav");
  if (!siteNav) return;

  // Platform detection for keyboard shortcut hint
  const platform =
    (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform ?? navigator.platform;
  const isMac = platform.toUpperCase().includes("MAC");
  const shortcutHint = siteNav.querySelector(".nav-search-shortcut");
  if (shortcutHint) {
    shortcutHint.textContent = isMac ? "⌘K" : "Ctrl+K";
  }
}

document.addEventListener("astro:page-load", initNav);
