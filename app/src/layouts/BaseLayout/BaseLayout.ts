function initResponsiveUI() {
  const menuBtn = document.querySelector<HTMLElement>('[data-layout="menu-btn"]');
  const navPanel = document.querySelector<HTMLElement>('[data-layout="nav-panel"]');
  const navBackdrop = document.querySelector<HTMLElement>('[data-layout="nav-backdrop"]');
  const chatPanel = document.querySelector<HTMLElement>('[data-chat="panel"]');
  const chatFab = document.querySelector<HTMLElement>('[data-layout="chat-fab"]');
  const chatOverlay = document.querySelector<HTMLElement>('[data-layout="chat-overlay"]');
  const chatOverlayBackdrop = document.querySelector<HTMLElement>('[data-layout="chat-overlay-backdrop"]');
  const chatOverlayContent = document.querySelector<HTMLElement>('[data-layout="chat-overlay-content"]');

  function closeNav() {
    navPanel?.classList.remove("open");
    navBackdrop?.classList.remove("visible");
    document.body.classList.remove("overflow-hidden");
  }

  function moveChatToOverlay() {
    if (!chatPanel || !chatOverlayContent) return;
    while (chatPanel.firstChild) {
      chatOverlayContent.appendChild(chatPanel.firstChild);
    }
  }

  function moveChatBack() {
    if (!chatPanel || !chatOverlayContent) return;
    while (chatOverlayContent.firstChild) {
      chatPanel.appendChild(chatOverlayContent.firstChild);
    }
  }

  function closeChat() {
    chatOverlay?.classList.remove("open");
    chatOverlayBackdrop?.classList.remove("visible");
    moveChatBack();
    document.body.classList.remove("overflow-hidden");
  }

  function closeAll() {
    closeNav();
    closeChat();
  }

  // Nav slide-down panel toggle
  function toggleNav() {
    const willOpen = !navPanel?.classList.contains("open");
    closeAll();
    if (willOpen) {
      navPanel?.classList.add("open");
      navBackdrop?.classList.add("visible");
      document.body.classList.add("overflow-hidden");
    }
  }

  menuBtn?.addEventListener("click", toggleNav);

  navBackdrop?.addEventListener("click", closeNav);

  // Close nav when a nav link is clicked
  navPanel?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  function openChat() {
    closeNav();
    moveChatToOverlay();
    chatOverlay?.classList.add("open");
    chatOverlayBackdrop?.classList.add("visible");
    document.body.classList.add("overflow-hidden");
  }

  // Mobile chat FAB
  chatFab?.addEventListener("click", openChat);

  // Close chat overlay
  const chatOverlayClose = document.querySelector<HTMLElement>('[data-chat="overlay-close"]');
  chatOverlayClose?.addEventListener("click", closeChat);
  chatOverlayBackdrop?.addEventListener("click", closeChat);

  // Close nav panel when resizing past xl breakpoint (sidebar becomes visible)
  const xlQuery = window.matchMedia("(min-width: 1280px)");
  xlQuery.addEventListener("change", (e) => {
    if (e.matches) closeNav();
  });

  // Move chat back to sidebar when resizing past lg breakpoint
  const lgQuery = window.matchMedia("(min-width: 1024px)");
  lgQuery.addEventListener("change", (e) => {
    if (e.matches) closeChat();
  });
}

document.addEventListener("astro:page-load", initResponsiveUI);

// Preserve nav scroll across View Transitions
let savedNavScroll = 0;
document.addEventListener("astro:before-swap", () => {
  const nav = document.querySelector<HTMLElement>('[data-nav="root"]');
  if (nav) savedNavScroll = nav.scrollTop;
  document.body.classList.remove("overflow-hidden");
});
document.addEventListener("astro:after-swap", () => {
  const nav = document.querySelector<HTMLElement>('[data-nav="root"]');
  if (nav) nav.scrollTop = savedNavScroll;
});
