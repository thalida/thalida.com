# Meta Card Image Redesign

## Problem

The current OG/social card image (`card-512x512.png`) features a lime-to-teal gradient background with purple text and a Memoji avatar. This no longer matches the site's design, which uses a dark midnight theme with neon/teal accents and monospace typography.

## Design

### Concept

A stylized, artistic `<3` mark (matching the favicon motif) with neon glow effects on the midnight background, with "thalida.com" as supporting text.

### Visual Specification

**Background:** Solid `#030a12` (midnight)

**Hero element:** The `<` chevron and `3` numeral drawn as thick expressive strokes (~16-20px stroke width at 1200px scale), centered with slight upward offset. Matching the favicon's stroke style but larger and more artistic.

**Glow effect:** Double-layer SVG filter:
- Tight inner glow (small blur radius, higher opacity)
- Wide outer bloom (large blur radius, lower opacity)
- Both in `#1be48c` (teal)
- Creates a neon sign / electric feel

**Text:** "thalida.com" centered below the mark, converted to paths from a geometric sans font. Modest size — the mark is the star, the text is supporting.

### Colors

| Element    | Color     | Notes                        |
|-----------|-----------|------------------------------|
| Background | `#030a12` | Midnight, matches site bg    |
| Strokes    | `#1be48c` | Teal, matches favicon        |
| Glow       | `#1be48c` | At 0.3-0.6 opacity for bloom |
| Text       | `#e8f0f8` | Primary text color           |

### Dimensions

- **Primary:** 1200x630px (standard OG image, optimal for Twitter/X, Facebook, LinkedIn, Slack, Discord)
- **Square fallback:** 512x512px (recomposed for square aspect ratio)

### Layout (1200x630)

The `<3` mark occupies roughly the center 40% of canvas height with comfortable breathing room to edges. Text sits below with appropriate spacing.

### Layout (512x512)

Same elements recomposed: mark slightly larger relative to canvas, text tighter below.

## Implementation Approach

1. Create SVG source files at both dimensions with glow filters
2. Convert text to paths (eliminates font-loading concerns)
3. Use `resvg` or `sharp` for PNG conversion
4. Output: `app/public/card-1200x630.png` and updated `app/public/card-512x512.png`
5. Update `SEO.astro` to reference 1200x630 as primary OG image

## Files Affected

- `app/public/card-1200x630.png` (new)
- `app/public/card-512x512.png` (replaced)
- `app/src/components/SEO/SEO.astro` (update default OG image path)
- SVG source files (new, kept for future editing)
