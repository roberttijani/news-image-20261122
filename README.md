# World News — 22 November 2026

[![make.fun](https://make.fun/badge/news-image-20261122.svg)](https://make.fun/bounty/news-image-20261122)
[![Rank](https://make.fun/badge/news-image-20261122/roberttijani/news-image-20261122/rank.svg)](https://make.fun/bounty/news-image-20261122)
[![Reward](https://make.fun/badge/news-image-20261122/roberttijani/news-image-20261122/reward.svg)](https://make.fun/bounty/news-image-20261122)

A deterministic Swiss Editorial front-page news digest renderer and competition entry for the [make.fun bounty "Sum up 22 November's world news in one image"](https://make.fun/bounty/news-image-20261122).

## Visual Design (Swiss Editorial Broadsheet)

Designed in high-contrast editorial broadsheet style (inspired by *The Economist* and *Monocle*), optimized for clear readability even at 300px thumbnail view:

- **Archival Palette**: Warm archival paper (`#F6F3EC`), deep ink navy (`#0F172A`), editorial crimson (`#C81E1E`), and muted steel-blue illustration accents (`#648595`, `#9BB3BF`, `#2C4A5A`).
- **Masthead (Top 148px)**: Bold display serif `WORLD NEWS` title on the left, framed crimson `22 NOVEMBER 2026` date badge on the right, and classic double horizontal rules.
- **Asymmetric 5-Panel Grid**:
  1. **Top-Left Hero (60% width)**: `CLIMATE • TURKEY` · `CONFIRMED` — *COP31 NEARS FINAL DEAL* (Antalya overtime talks announce new package, Reuters / Arab News) with custom modern summit pavilion, Mediterranean coastline, and stylized globe illustration.
  2. **Top-Right Panel (40% width)**: `MIDDLE EAST` · `OFFICIAL` — *SAUDI INTERCEPTS MISSILE* (Houthi launch blocked over southern airspace; Iran plans nationwide winter power rationing, Anadolu Agency / RFE/RL) with geodesic radar dome, elevated launcher battery, and kinetic crimson interception arc.
  3. **Bottom-Left Panel (33.3% width)**: `TECH • US-CHINA` · `REPORTED` — *US DATA CENTER CURB* (Import ban advances despite Big Tech pushback, Reuters / TBS) with multi-bay enterprise server rack, central AI processor die, and fiber-optic circuit topology.
  4. **Bottom-Center Panel (33.3% width)**: `EUROPE • NATO` · `OFFICIAL` — *POLAND AIRSPACE ALERT* (NATO set to meet after missile incursion, Kyiv Independent / Reuters) with tactical radar PPI scope, graduated 360° compass bezel, and border incursion alert vector.
  5. **Bottom-Right Panel (33.3% width)**: `AFRICA • NIGERIA` · `REPORTED` — *BOAT CAPSIZES: 24 DEAD* (Mourners killed as funeral boat capsizes, Times of India) with solemn layered ocean/river swells, listing wooden ferry silhouette, searchlight beam, and remembrance lifebuoy.
- **Footer Strip (Bottom 56px)**: Centered date and folio `SUNDAY, 22 NOVEMBER 2026 • FIVE REGIONS • GLOBAL DAILY DIGEST`.

## Architecture & Requirements

- `data/stories.json`: Structured news data model for all five regional stories.
- `scripts/render.ts`: Deterministic SVG renderer that rasters at 2048×2048 with `@resvg/resvg-js` and downsamples via `sharp` with Lanczos3 anti-aliasing to an exact 1024×1024 PNG at `assets/entry.png`. Zero external network requests, zero timestamps, zero non-determinism.
- `main.ts`: Competition runtime entrypoint (Node 22 standard library only — `node:fs`, `node:path`). Validates PNG signature, dimensions (1024×1024), size (< 1 MiB), and deterministically writes `entry.png` to `/output/entry.png` (or `${MAKEFUN_OUTPUT_DIR}/entry.png`).

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
