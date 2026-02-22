const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, [role="button"], .cursor-pointer, [class*="cursor-pointer"]';

const NEON = "#39ff14";
const TEAL = "#00e5a0";
const DOT_SIZE = 8;
const DOT_SIZE_HOVER = 12;

function initNeonCursor() {
  // Bail on touch devices
  if (window.matchMedia("(pointer: coarse)").matches) return;

  const dot = document.getElementById("neon-cursor");
  const maybeCanvas = document.getElementById("neon-cursor-trail") as HTMLCanvasElement | null;
  if (!dot || !maybeCanvas) return;

  const canvas = maybeCanvas;

  // Style the dot
  Object.assign(dot.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: `${DOT_SIZE}px`,
    height: `${DOT_SIZE}px`,
    borderRadius: "50%",
    background: NEON,
    boxShadow: `0 0 4px ${NEON}, 0 0 12px ${NEON}, 0 0 24px ${NEON}80`,
    pointerEvents: "none",
    zIndex: "9999",
    transition: "width 0.15s, height 0.15s, background 0.15s, box-shadow 0.15s",
    transform: "translate(-50%, -50%)",
    opacity: "0",
  });

  // Style the canvas
  Object.assign(canvas.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "9998",
  });

  // Set canvas resolution
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) return;

  // Add class to hide default cursor
  document.documentElement.classList.add("has-custom-cursor");

  let mouseX = 0;
  let mouseY = 0;
  let isHovering = false;
  let isVisible = false;

  // Track mouse position
  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isVisible) {
      isVisible = true;
      dot.style.opacity = "1";
    }
  });

  // Hide when mouse leaves window
  document.addEventListener("mouseleave", () => {
    isVisible = false;
    dot.style.opacity = "0";
  });

  document.addEventListener("mouseenter", () => {
    isVisible = true;
    dot.style.opacity = "1";
  });

  // Detect interactive elements via event delegation
  document.addEventListener("mouseover", (e) => {
    const target = e.target as Element;
    if (target.closest(INTERACTIVE_SELECTOR)) {
      isHovering = true;
      const size = `${DOT_SIZE_HOVER}px`;
      dot.style.width = size;
      dot.style.height = size;
      dot.style.background = TEAL;
      dot.style.boxShadow = `0 0 4px ${TEAL}, 0 0 12px ${TEAL}, 0 0 24px ${TEAL}80`;
    }
  });

  document.addEventListener("mouseout", (e) => {
    const target = e.target as Element;
    if (target.closest(INTERACTIVE_SELECTOR)) {
      isHovering = false;
      const size = `${DOT_SIZE}px`;
      dot.style.width = size;
      dot.style.height = size;
      dot.style.background = NEON;
      dot.style.boxShadow = `0 0 4px ${NEON}, 0 0 12px ${NEON}, 0 0 24px ${NEON}80`;
    }
  });

  // Animation loop
  function animate() {
    // Position the dot
    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;

    // Fade existing trail
    if (ctx) {
      ctx.fillStyle = "rgba(3, 10, 18, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw glow at current position
      if (isVisible) {
        const color = isHovering ? TEAL : NEON;
        const gradient = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 16);
        gradient.addColorStop(0, color + "40");
        gradient.addColorStop(1, color + "00");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 16, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// Initialize on page load (supports Astro client-side navigation)
document.addEventListener("astro:page-load", initNeonCursor);
