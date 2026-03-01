function initNav() {
  const siteNav = document.querySelector<HTMLElement>('[data-nav="root"]');
  if (!siteNav) return;

  // Platform detection for keyboard shortcut hint
  const platform =
    (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform ?? navigator.platform;
  const isMac = platform.toUpperCase().includes("MAC");
  const shortcutHint = siteNav.querySelector<HTMLElement>('[data-nav="shortcut-hint"]');
  if (shortcutHint) {
    shortcutHint.textContent = isMac ? "⌘K" : "Ctrl+K";
  }
}

document.addEventListener("astro:page-load", initNav);
