import { createIdleManager } from "@scripts/idle-manager";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

let layoutAC: AbortController | null = null;
let idleManager: ReturnType<typeof createIdleManager> | null = null;

function initResponsiveUI() {
  layoutAC?.abort();
  idleManager?.destroy();
  layoutAC = new AbortController();
  const { signal } = layoutAC;

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

  function toggleNav() {
    const willOpen = !navPanel?.classList.contains("open");
    closeAll();
    if (willOpen) {
      navPanel?.classList.add("open");
      navBackdrop?.classList.add("visible");
      document.body.classList.add("overflow-hidden");
    }
  }

  menuBtn?.addEventListener("click", toggleNav, { signal });

  navBackdrop?.addEventListener("click", closeNav, { signal });

  navPanel?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav, { signal });
  });

  function openChat() {
    closeNav();
    moveChatToOverlay();
    chatOverlay?.classList.add("open");
    chatOverlayBackdrop?.classList.add("visible");
    document.body.classList.add("overflow-hidden");
    // Scroll chat to bottom after overlay is visible
    requestAnimationFrame(() => {
      const msgs = chatOverlayContent?.querySelector<HTMLElement>('[data-chat="messages"]');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    });
  }

  chatFab?.addEventListener("click", openChat, { signal });

  const chatOverlayClose = document.querySelector<HTMLElement>('[data-chat="overlay-close"]');
  chatOverlayClose?.addEventListener("click", closeChat, { signal });
  chatOverlayBackdrop?.addEventListener("click", closeChat, { signal });

  const xlQuery = window.matchMedia("(min-width: 1280px)");
  xlQuery.addEventListener(
    "change",
    (e) => {
      if (e.matches) closeNav();
    },
    { signal },
  );

  const lgQuery = window.matchMedia("(min-width: 1024px)");
  lgQuery.addEventListener(
    "change",
    (e) => {
      if (e.matches) closeChat();
    },
    { signal },
  );

  // Global idle detection — broadcasts site:idle / site:active for all consumers
  idleManager = createIdleManager({
    timeoutMs: IDLE_TIMEOUT_MS,
    onIdle() {
      document.dispatchEvent(new CustomEvent("site:idle"));
    },
    onActive() {
      document.dispatchEvent(new CustomEvent("site:active"));
    },
  });

  document.addEventListener("visibilitychange", () => idleManager?.handleVisibilityChange(document.hidden), {
    signal,
  });
  for (const event of ["mousemove", "keydown", "touchstart"] as const) {
    document.addEventListener(event, () => idleManager?.handleActivity(), { passive: true, signal });
  }
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
