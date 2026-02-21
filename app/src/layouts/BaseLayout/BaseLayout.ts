function initDrawers() {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const chatBtn = document.getElementById("mobile-chat-btn");
  const siteNav = document.getElementById("site-nav");
  const chatPanel = document.getElementById("chat-panel");
  const backdrop = document.getElementById("drawer-backdrop");

  if (!menuBtn || !chatBtn || !siteNav || !chatPanel || !backdrop) return;

  function closeAll() {
    siteNav.classList.remove("open");
    chatPanel.classList.remove("open");
    backdrop.classList.remove("visible");
    document.body.style.overflow = "";
  }

  menuBtn.addEventListener("click", () => {
    const willOpen = !siteNav.classList.contains("open");
    closeAll();
    if (willOpen) {
      siteNav.classList.add("open");
      backdrop.classList.add("visible");
      document.body.style.overflow = "hidden";
    }
  });

  chatBtn.addEventListener("click", () => {
    const willOpen = !chatPanel.classList.contains("open");
    closeAll();
    if (willOpen) {
      chatPanel.classList.add("open");
      backdrop.classList.add("visible");
      document.body.style.overflow = "hidden";
    }
  });

  backdrop.addEventListener("click", closeAll);

  // Mobile search button closes drawers (CommandPalette handles opening itself)
  const searchBtn = document.getElementById("mobile-search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", closeAll);
  }
}

document.addEventListener("astro:page-load", initDrawers);

let savedNavScroll = 0;
document.addEventListener("astro:before-swap", () => {
  const nav = document.getElementById("site-nav");
  if (nav) savedNavScroll = nav.scrollTop;
  document.body.style.overflow = "";
});
document.addEventListener("astro:after-swap", () => {
  const nav = document.getElementById("site-nav");
  if (nav) nav.scrollTop = savedNavScroll;
});
