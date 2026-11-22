# World News — 22 November 2026

[![make.fun](https://make.fun/badge/news-image-20261122.svg)](https://make.fun/bounty/news-image-20261122)
[![Rank](https://make.fun/badge/news-image-20261122/roberttijani/news-image-20261122/rank.svg)](https://make.fun/bounty/news-image-20261122)
[![Reward](https://make.fun/badge/news-image-20261122/roberttijani/news-image-20261122/reward.svg)](https://make.fun/bounty/news-image-20261122)

A deterministic Swiss Editorial front-page news digest renderer and competition entry for the [make.fun bounty "Sum up 22 November's world news in one image"](https://make.fun/bounty/news-image-20261122).

## Visual Design (Swiss Editorial Broadsheet)

Designed in high-contrast editorial broadsheet style (inspired by *The Economist* and *Monocle*), optimized for clear readability even at 300px thumbnail view:

- **Archival Palette**: Warm archival paper (`#F6F3EC`), deep ink navy (`#0F172A`), editorial crimson (`#C81E1E`), and muted steel-blue illustration accents (`#648595`, `#9BB3BF`, `#2C4A5A`).
- **Masthead & Key Numbers**: Bold display serif `WORLD NEWS` title on the left, framed crimson `SUNDAY · 22 NOVEMBER 2026` date badge on the right, followed by 6 metric cards (`196`, `24+`, `$31M`, `4`, `128`, `89`).
- **7-Region Coverage Bar**: Proportional distribution across Middle East (4), Asia (3), Americas (3), Europe (2), Africa (2), Oceania (2), Global (1) for 17 total verified stories.
- **Top 3 Hero Cards**:
  1. `GLOBAL · OFFICIAL`: *COP31 FINAL TEXT ISSUED* (Antalya plenary deadline on fossil fuels and climate finance).
  2. `MIDDLE EAST · OFFICIAL`: *SAUDI INTERCEPTS MISSILE* (Downed over western Saudi Arabia; Mecca alert issued).
  3. `AMERICAS · REPORTED`: *US DATA-CENTER CURB* (US advances optical-transceiver import ban despite Big Tech industry opposition).
- **Stories 4–9 Illustrated Grid**:
  4. `EUROPE · OFFICIAL`: *POLAND AIRSPACE ALERT* (Swedish Gripen interceptor fails in bad weather; NATO meets Nov 23).
  5. `MIDDLE EAST · OFFICIAL`: *BAHRAIN DEMANDS UN ACTION* (Manama seeks UNSC accountability & compensation for industrial site strike).
  6. `AFRICA · REPORTED`: *NIGERIA BOAT CAPSIZES: 24+* (At least 24 mourners killed in funeral boat accident).
  7. `ASIA · OFFICIAL`: *JAPAN BANS 4 CHEMICALS* (METI CSCL import ban takes effect).
  8. `EUROPE · CONFIRMED`: *PAOLO BULGARI DIES AT 89* (Legendary luxury jeweler passes away).
  9. `OCEANIA · OFFICIAL`: *AUS & NZ RUSH PACIFIC AID* (Humanitarian relief mobilized for severe El Niño threat).
- **Zone 6 (Bottom Split)**:
  - **Left**: Genuine Natural Earth 110m equirectangular projection world map with 125 polygon rings, 9 geocoded story pins with leader lines, and a 3×3 legend.
  - **Right**: 8 additional verified briefs (10–17) with color-coded region badges and news desk sources.
- **Footer Verification Strip**: Two-box panel with "HOW WE CHECKED" verification tiers (`CONFIRMED`, `OFFICIAL`, `REPORTED`) and strict 22 November 2026 UTC date audit record.

## Architecture & Requirements

- `data/stories.json`: Structured news data model for all 17 stories across 7 regions.
- `scripts/render.ts`: Deterministic SVG renderer that rasters at 2048×2048 with `@resvg/resvg-js` and downsamples via `sharp` with Lanczos3 anti-aliasing to an exact 1024×1024 PNG at `assets/entry.png`. Zero external network requests, zero timestamps, zero non-determinism.
- `main.ts`: Competition runtime entrypoint (Node 22 standard library only — `node:fs`, `node:path`, `node:url`). Validates PNG signature, dimensions (1024×1024), size (< 1 MiB), and deterministically writes `entry.png` to `/output/entry.png` (or `${MAKEFUN_OUTPUT_DIR}/entry.png`).

## Quick Start

### Run & Verify Output
```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

### Re-render Image from Source
```bash
npm run render
```

## Specifications

- **Target Output**: `assets/entry.png`
- **Dimensions**: Exactly 1024 × 1024 pixels
- **File Size**: ~430 KB (strictly < 1 MiB, target 200–450 KB)
- **Format**: PNG (magic bytes `89 50 4E 47 0D 0A 1A 0A` verified)
- **Runtime Dependencies**: Zero (Node 22 built-in `node:fs` and `node:path` only)
- **License**: MIT
