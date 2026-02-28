# Responsive Tailwind Redesign — Design

## Goal

Replace all raw CSS `@media` queries with Tailwind responsive utility classes. Add proper mobile and tablet layouts using a mobile-first approach. Ignore existing mobile drawer patterns and build fresh.

## Approach

**Approach A (chosen):** Move all responsive behavior into Tailwind utility classes directly in Astro component markup. Remove raw `@media` blocks from CSS files entirely.

## Breakpoints

Using Tailwind v4 defaults (mobile-first):

| Name | Width | Layout |
|------|-------|--------|
| Default | `< 640px` | Single column, header bar, slide-down nav panel, floating chat button |
| `sm` | `640px+` | Single column, wider padding |
| `md` | `768px+` | Two columns: content + chat panel. Nav in slide-down panel from header |
| `lg` | `1024px+` | Three columns: nav sidebar + content + chat panel (current desktop) |
| `xl` | `1280px+` | Same as lg, wider content area |

## Layout by Viewport

### Mobile (< 768px)
- Single column, full-width content
- Header bar: hamburger (nav) | "thalida" brand | search + chat buttons
- Nav: slide-down panel from top, `fixed top-12 w-full max-h-[60vh]`, backdrop blur, animated
- Chat: hidden by default, floating button (bottom-right) opens overlay panel
- Spotify player: inside chat panel only

### Tablet (768px–1023px)
- Two columns: content (grows) + chat panel (fixed ~280px)
- Header bar still visible (hamburger + brand + search). No chat button (panel already visible)
- Nav: same slide-down panel as mobile

### Desktop (1024px+)
- Three columns: nav sidebar (basis-1/5, max-w-64) + content (grows) + chat (basis-1/4, max-w-80)
- No header bar, no drawers, no floating buttons

## Files to Modify

### BaseLayout.css
- Remove entire `@media (max-width: 767px)` block (lines 202-255)
- `#layout`: `flex flex-col lg:flex-row w-screen h-svh`
- `#mobile-toolbar`: Change from `hidden` to `flex lg:hidden` (move to markup)
- `#site-nav`: `hidden lg:block lg:shrink-0 lg:grow-0 lg:basis-1/5 lg:max-w-64 lg:py-3 lg:pl-3 lg:pr-0`
- `#content-viewer`: Add `px-4 py-4 sm:px-6 sm:py-6`
- `#chat-panel`: `hidden md:block md:shrink-0 md:basis-1/4 md:max-w-80`
- Remove `#drawer-backdrop` element; replaced by nav panel's own backdrop
- Remove `--spacing-mobile-panel` theme token (no longer needed)

### BaseLayout.astro
- Add responsive Tailwind classes to `#layout`, `#mobile-toolbar`, etc.
- Replace `#drawer-backdrop` with nav panel backdrop inside the slide-down panel component
- Add floating chat button: `fixed bottom-4 right-4 md:hidden`
- Mobile chat button in toolbar gets `md:hidden`

### BaseLayout.ts
- Rewrite drawer logic:
  - Nav: toggle slide-down panel (translate-y animation) + backdrop
  - Chat: toggle mobile overlay (only on < md)
  - On `lg+`: no JS drawer behavior needed (panels are always visible)

### ProjectTree.css
- Remove both `@media` blocks
- Search trigger: visibility controlled by `hidden lg:flex` in markup
- Brand heading: visibility controlled by `hidden lg:block` in markup

### ProjectTree.astro
- Add responsive classes: `hidden lg:flex` on search trigger, `hidden lg:block` on h2

### Chat.css
- No media queries to remove (none exist currently)

### Chat.astro
- On mobile: panel becomes overlay when toggled via floating button

### CommandPalette.css
- Remove `@media (max-width: 767px)` block
- Dialog: `max-w-full rounded-none mt-12 md:max-w-lg md:rounded-lg md:mt-0`
- Footer: `hidden md:flex`

### CollectionGrid.css
- Remove both `@media` blocks
- Grid: `grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3`
- Masonry mobile fallback via same breakpoint classes

### index.astro
- `.home-projects`: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

### about.astro
- `.about-photos`: `grid-cols-2 sm:grid-cols-4`

## Nav Slide-Down Panel Behavior

When hamburger is tapped (mobile/tablet):
1. Nav panel slides down from below the header bar
2. Semi-transparent backdrop appears behind it
3. Panel: `fixed top-12 left-0 w-full max-h-[60vh] overflow-y-auto bg-midnight/95 backdrop-blur-md border-b border-border z-50`
4. Animated: `transition-transform duration-300 ease-in-out`
5. Tapping backdrop or a nav link closes the panel

## Mobile Chat Overlay Behavior

When floating chat button is tapped (< md only):
1. Chat panel slides up from the bottom
2. Backdrop appears behind it
3. Panel: `fixed bottom-0 left-0 w-full h-[70vh] bg-midnight border-t border-border z-50`
4. Close button at top of panel
5. Contains full chat UI + Spotify player

## What Gets Deleted

- All `@media (max-width: 767px)` blocks across all CSS files
- All `@media (min-width: 768px)` blocks across all CSS files
- `@media (min-width: 1536px)` in CollectionGrid.css
- `@media (max-width: 639px)` in CollectionGrid.css
- `#drawer-backdrop` element from BaseLayout.astro
- `--spacing-mobile-panel` theme token
- Current drawer toggle logic in BaseLayout.ts (replaced with new logic)

## What's Preserved

- `@media (prefers-color-scheme: dark)` in live-window.css (not a layout query)
- All theme tokens except `--spacing-mobile-panel`
- All non-responsive CSS (component styles, cursors, animations)
- Astro View Transitions persistence on chat and Spotify player
