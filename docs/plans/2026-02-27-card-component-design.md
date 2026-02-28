# Card Component System Design

## Goal

Create a generic Card component that exposes all card variants used across the site. Replace inline card markup in CollectionGrid and the home page with a single shared component.

## File Structure

```
app/src/components/Card/
  Card.astro          # dispatcher: picks the right variant via prop
  StackedCard.astro   # vertical: cover image, eyebrow, title, desc, tags
  LinkCard.astro      # external link: domain, favicon, title, desc
  FlagCard.astro      # horizontal: thumbnail + title/desc (recipes)
  GalleryCard.astro   # image-dominant with text overlay
  card-utils.ts       # shared helpers (pickColor, tileSvg, PLACEHOLDER_COLORS)
```

## Card.astro (Dispatcher)

- Props: `variant` (`"stacked" | "link" | "flag" | "gallery"`, default `"stacked"`), `item: NavItem`
- Renders the matching sub-component, passing through `item` and any extra props

## Variant Components

Each variant file accepts `item: NavItem` and renders its own complete markup. The markup is extracted directly from CollectionGrid with no behavior changes.

- **StackedCard**: cover image (96px, placeholder if missing), category/year eyebrow, title, description (line-clamp-2), tag pills
- **LinkCard**: domain display with external icon, favicon or letter fallback, title, description
- **FlagCard**: 64x64 thumbnail on left, title + description on right
- **GalleryCard**: full image with text overlay, category badge

## card-utils.ts

Moves from CollectionGrid into shared module:
- `PLACEHOLDER_COLORS` array
- `pickColor(str)` — deterministic color from string hash
- `tileSvg(title)` — repeating SVG text pattern for placeholders

## Changes to Existing Files

### CollectionGrid.astro
- Import `Card` from `@components/Card/Card.astro`
- Replace inline card markup in `items.map()` with `<Card variant={...} item={item} />`
- Collection-to-variant mapping stays here (links -> "link", recipes -> "flag", gallery -> "gallery", default -> "stacked")
- Remove `pickColor`, `tileSvg`, `PLACEHOLDER_COLORS` (now in card-utils.ts)
- Masonry script, grid layout, and category filter markup stay unchanged

### index.astro
- Import `Card` from `@components/Card/Card.astro`
- Replace inline featured project card markup with `<Card variant="stacked" item={project} />`
- Home page cards adopt the stacked card visual style (96px cover, eyebrow, tags)

## Visual Changes

The home page featured project cards will switch from their current style (16/10 aspect-ratio cover, simple text) to the CollectionGrid stacked card style (96px cover, category+year eyebrow, tag pills). This creates visual consistency across the site.
