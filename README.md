# World News — 22 November 2026 Editorial Digest

A deterministic Swiss Editorial front-page news digest renderer and entry for the [make.fun bounty "Sum up 22 November's world news in one image"](https://make.fun/bounty/news-image-20261122).

## Visual Design

Crafted in classic Swiss Editorial broadsheet style (inspired by *The Economist* and *Monocle*), optimized for high contrast and readability down to 300px thumbnail view:

- **Archival Palette**: Warm archival paper (`#F6F3EC`), deep ink navy (`#0F172A`), editorial crimson (`#C81E1E`), and muted steel-blue illustration accents (`#648595`, `#9BB3BF`, `#2C4A5A`).
- **Masthead**: High-contrast display serif `WORLD NEWS` masthead with a prominent crimson `22 NOVEMBER 2026` date badge and double horizontal rules.
- **Asymmetric 5-Panel Grid**:
  1. **Top-Left Hero (60% width)**: `CLIMATE • TURKEY` · `CONFIRMED` — *COP31 NEARS FINAL DEAL* (Antalya overtime talks announce new package, Reuters / Arab News) with custom summit pavilion & globe illustration.
  2. **Top-Right Panel (40% width)**: `MIDDLE EAST` · `OFFICIAL` — *SAUDI INTERCEPTS MISSILE* (Houthi launch blocked; Iran plans power rationing, Anadolu Agency / RFE/RL) with protective radar dome & interception arc.
  3. **Bottom-Left Panel (33.3% width)**: `TECH • US-CHINA` · `REPORTED` — *US DATA CENTER CURB* (Import ban advances despite Big Tech pushback, Reuters / TBS) with server rack & fiber-optic bus illustration.
  4. **Bottom-Center Panel (33.3% width)**: `EUROPE • NATO` · `OFFICIAL` — *POLAND AIRSPACE ALERT* (NATO set to meet after missile incursion, Kyiv Independent / Reuters) with tactical radar PPI scope & incursion vector.
  5. **Bottom-Right Panel (33.3% width)**: `AFRICA • NIGERIA` · `REPORTED` — *BOAT CAPSIZES: 24 DEAD* (Mourners killed as funeral boat capsizes, Times of India) with solemn ocean swell silhouette.
- **Footer Strip**: Centered date & folio record `SUNDAY, 22 NOVEMBER 2026 • FIVE REGIONS • GLOBAL DAILY DIGEST`.

## Architecture

- `data/stories.json`: Structured news data model for easy updates.
- `scripts/render.ts`: Deterministic vector renderer that compiles the SVG, rasterizes it at 2048×2048 with `@resvg/resvg-js`, and downsamples with Lanczos3 resampling via `sharp` to an exact 1024×1024 PNG at `assets/entry.png`.
- `main.ts`: Competition runtime entrypoint (Node 22 standard library only — `node:fs`, `node:path`). Validates PNG signature, dimensions (1024×1024), size (< 1 MiB), and deterministically writes `entry.png` to `/output/entry.png` (or `${MAKEFUN_OUTPUT_DIR}/entry.png`).

## Quick Start

### 1. Test Output Delivery
```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

### 2. Regenerate Editorial Image
```bash
npm run render
```

## Specifications

- **Output Path**: `assets/entry.png`
- **Dimensions**: Exactly 1024 × 1024 pixels
- **Format**: PNG (8-byte PNG signature verified)
- **File Size**: ~363 KB (strictly < 1 MiB, target 200–450 KB)
- **External Dependencies at Runtime (`main.ts`)**: None (`node:fs`, `node:path` only)
- **License**: MIT
