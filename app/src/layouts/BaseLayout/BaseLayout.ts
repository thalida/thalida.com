function initResponsiveUI() {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const navPanel = document.getElementById("nav-panel");
  const navBackdrop = document.getElementById("nav-backdrop");
  const chatPanel = document.getElementById("chat-panel");
  const chatFab = document.getElementById("mobile-chat-fab");
  const chatOverlay = document.getElementById("chat-overlay");
  const chatOverlayClose = document.getElementById("chat-overlay-close");
  const chatOverlayBackdrop = document.getElementById("chat-overlay-backdrop");
  const chatOverlayContent = document.getElementById("chat-overlay-content");

  function closeNav() {
    navPanel?.classList.remove("open");
    navBackdrop?.classList.remove("visible");
    document.body.style.overflow = "";
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
    document.body.style.overflow = "";
  }

  function closeAll() {
    closeNav();
    closeChat();
  }

  // Nav slide-down panel toggle
  menuBtn?.addEventListener("click", () => {
    const willOpen = !navPanel?.classList.contains("open");
    closeAll();
    if (willOpen) {
      navPanel?.classList.add("open");
      navBackdrop?.classList.add("visible");
      document.body.style.overflow = "hidden";
    }
  });

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
    document.body.style.overflow = "hidden";
  }

  // Mobile chat FAB
  chatFab?.addEventListener("click", openChat);

  // Close chat overlay
  chatOverlayClose?.addEventListener("click", closeChat);
  chatOverlayBackdrop?.addEventListener("click", closeChat);
}

document.addEventListener("astro:page-load", initResponsiveUI);

// Preserve nav scroll across View Transitions
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
