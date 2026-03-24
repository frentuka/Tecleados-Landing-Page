# Tecleados — Landing Page

A design-driven single-page landing site for **Tecleados**, an Argentine artisanal mechanical keyboard brand that fuses digital craftsmanship, native natural materials, and human warmth.

---

## What is Tecleados?

Tecleados builds limited-edition mechanical keyboards out of native Argentine woods — Lenga (Patagonia), Algarrobo (Norte), Quebracho (Chaco), and Guatambú (Misiones). Each keyboard is a numbered piece blending custom firmware, hotswappable switches, and hand-oiled hardwood cases.

The brand rests on three pillars:

| Pillar | What it means |
|--------|--------------|
| **Digital** | 8-bit retro aesthetics, open-source firmware, hacker-friendly |
| **Natural** | Sustainably sourced Argentine native woods |
| **Humano** | Handmade in Buenos Aires, limited runs, community-first |

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| [Astro](https://astro.build) | 5.7 | Static site framework |
| [Tailwind CSS](https://tailwindcss.com) | 4.1 (Vite plugin) | Utility-first styling |
| [TypeScript](https://www.typescriptlang.org) | 5.8 | Type safety throughout |
| [GSAP](https://gsap.com) | 3.12 | Animation library (available, currently view-engine handles entrance anims) |

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# Start the development server (accessible on local network)
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

The dev server listens on `0.0.0.0`, so it's reachable from other devices on the same network.

---

## Project Structure

```
tecleados-landing-page/
├── public/
│   ├── fonts/           # Poppins (4 weights) + JetBrains Mono
│   ├── images/          # Product and process step images
│   ├── pixel-art/       # Pixel art assets
│   └── favicon.svg
├── src/
│   ├── pages/
│   │   └── index.astro  # Entry point — composes all 7 section views
│   ├── layouts/
│   │   └── BaseLayout.astro  # Root layout: meta tags, font preload, theme init
│   ├── components/
│   │   ├── Navigation.astro       # Bottom nav bar with 7 view buttons + toggles
│   │   ├── Footer.astro           # Brand footer with links and contact
│   │   ├── WoodGrainBackground.astro  # Fixed canvas procedural background
│   │   └── sections/
│   │       ├── HeroSection.astro         # View 1 — "Inicio"
│   │       ├── BrandStorySection.astro   # View 2 — "Historia"
│   │       ├── ProductShowcase.astro     # View 3 — "Teclados"
│   │       ├── ProcessSection.astro      # View 4 — "Proceso"
│   │       ├── WoodGallery.astro         # View 5 — "Maderas"
│   │       ├── DevModeSection.astro      # View 6 — "Specs"
│   │       └── CtaSection.astro          # View 7 — "Contacto"
│   ├── data/
│   │   ├── products.ts        # 4 keyboard products (name, description, status, price, wood)
│   │   ├── process-steps.ts   # 5 manufacturing steps
│   │   ├── wood-species.ts    # 4 native Argentine woods
│   │   └── testimonials.ts    # 4 customer testimonials
│   ├── scripts/
│   │   ├── view-engine.ts     # Core single-page navigation system (~270 lines)
│   │   ├── wood-grain-bg.ts   # Procedural canvas wood texture renderer (~693 lines)
│   │   └── gsap-init.ts       # GSAP + ScrollTrigger setup (~175 lines)
│   ├── styles/
│   │   └── global.css         # Full design system via CSS custom properties
│   └── types/                 # Shared TypeScript types
├── stuff/
│   ├── Tecleados – Identidad de Marca Final.pdf  # Official brand identity guide
│   └── Procedural_Knots_2022.pdf                 # ACM paper behind the wood texture algorithm
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## Architecture

### Single-Page View System

This site does **not scroll**. Instead it uses a custom view-switching engine (`src/scripts/view-engine.ts`) with 7 full-viewport views that transition in and out.

**Navigation methods:**
- Arrow keys `←` / `→` — switch between views
- Number keys `1`–`7` — jump directly to any view
- Mouse wheel (debounced 900ms) — vertical navigation within views
- Touch swipe (50px threshold) — swipe left/right to change view
- Hash-based routing — `#inicio`, `#historia`, etc. for bookmarking

**View lifecycle:**
1. Active view is `.view--active` (visible, pointer events on)
2. Exiting view gets `.view--exiting` for a 300ms CSS fade-out
3. Incoming view's `[data-enter]` elements receive staggered entrance animations (80ms base + 60ms per element)

Each view section has its own set of named `@keyframe` animations defined in `global.css` and applied dynamically by the view engine via `data-anim` attributes.

### Procedural Wood Grain Background

The fixed canvas background (`src/scripts/wood-grain-bg.ts`) generates a realistic wood texture procedurally at render time — no image files involved. The algorithm is based on the ACM SIGGRAPH paper *"Procedural Texturing of Solid Wood with Knots"* (included in `stuff/`).

Key techniques used:
- **Simplex 2D noise** with seeded RNG for reproducible grain
- **FBM (fractional Brownian motion)** for natural multi-scale variation
- **Annual ring simulation** — growth time isocurves give the ring pattern
- **Knot integration** — 1–2 knots per render, alive or dead, with smooth transitions using Quilez cubic smooth minimum
- **Potential-flow deflection** — grain fibers bend realistically around knots
- **Domain warping** — organic, non-repeating grain flow
- **Medullary rays** — perpendicular cross-grain highlights
- **Ambient animation loop** — slow Lissajous-path shimmer (~22s and ~31s incommensurable periods, never exactly repeats)
- **Theme-aware palettes** — muted walnut in dark mode, pale ash in light mode

The renderer is fully responsive (debounced resize, device pixel ratio up to 2x) and respects `prefers-reduced-motion`.

### Design System

All design tokens live in `src/styles/global.css` as Tailwind v4 CSS custom properties:

- **Colors:** Digital (cyan), Natural (green), Humano (warm orange), Ivory (whites/lights), Charcoal (darks), Sage (neutral green-gray)
- **Typography:** Poppins (primary) + JetBrains Mono (monospace), fluid scales via `clamp()`
- **Themes:** Dark (default, charcoal bg) and Light (ivory bg), toggled via `[data-theme]` on `<html>`, persisted in `localStorage`
- **Semantic tokens:** `--t-bg`, `--t-text`, `--t-border`, etc. for theme-agnostic component styling

---

## Views Overview

| # | Hash | Component | Content |
|---|------|-----------|---------|
| 1 | `#inicio` | HeroSection | Brand name, tagline, typewriter effect, navigation hint |
| 2 | `#historia` | BrandStorySection | Three pillars (Digital / Natural / Humano) as flip-in cards |
| 3 | `#teclados` | ProductShowcase | Touch/keyboard carousel of 4 keyboard models with status and price |
| 4 | `#proceso` | ProcessSection | Interactive 5-step manufacturing timeline (Selection → QA) |
| 5 | `#maderas` | WoodGallery | Grid of 4 Argentine wood species with swatches, origins, descriptions |
| 6 | `#specs` | DevModeSection | Full technical specs: firmware, connectivity, materials, switches |
| 7 | `#contacto` | CtaSection | Email capture, rotating testimonials, social links |

---

## Data & Content

All content is separated into typed TypeScript data files in `src/data/`. To update products, woods, process steps, or testimonials, edit those files — no component changes needed.

**Products** (`src/data/products.ts`) — each has: `name`, `description`, `image`, `status` (`available` | `coming-soon` | `sold-out`), `price`, `wood`

**Wood species** (`src/data/wood-species.ts`) — each has: `name`, `scientificName`, `origin`, `description`, `image`, `color` (hex)

---

## Agent Framework

This repo includes a multi-agent Claude Code setup under `.claude/agents/`, organized into 7 teams. Active agents for this project:

- [Frontend Developer](.claude/agents/engineering/frontend-developer.md)
- [UI Designer](.claude/agents/design/ui-designer.md)

See [CLAUDE.md](CLAUDE.md) for the full agent framework documentation.

---

## Browser Support

Built with Astro (outputs standard HTML/CSS/JS) targeting modern browsers. Key dependencies:
- Canvas 2D API (wood grain background)
- CSS custom properties + `@keyframes`
- `localStorage` (theme + dev mode persistence)
- `IntersectionObserver` (not required, gracefully unused)

---

## License

Private. All rights reserved — Tecleados.
