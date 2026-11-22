# World News — 22 November 2026

[![make.fun](https://make.fun/badge/news-image-20261122.svg)](https://make.fun/bounty/news-image-20261122)
[![Rank](https://make.fun/badge/news-image-20261122/roberttijani/news-image-20261122/rank.svg)](https://make.fun/bounty/news-image-20261122)
[![Reward](https://make.fun/badge/news-image-20261122/roberttijani/news-image-20261122/reward.svg)](https://make.fun/bounty/news-image-20261122)

A deterministic Swiss Editorial front-page news digest renderer and competition entry for the [make.fun bounty "Sum up 22 November's world news in one image"](https://make.fun/bounty/news-image-20261122).

## Visual Design (Swiss Editorial Broadsheet — Full-Day 24-Story Edition)

Designed in high-contrast editorial broadsheet style (inspired by *The Economist* and *Monocle*), optimized for clear readability even at 300px thumbnail view:

- **Archival Palette**: Warm archival paper (`#F6F3EC`), deep ink navy (`#0F172A`), editorial crimson (`#B91C1C`), and muted steel-blue illustration accents (`#648595`, `#9BB3BF`, `#2C4A5A`).
- **Masthead & Key Numbers**: Bold display serif `WORLD NEWS` title on the left, framed crimson `SUNDAY · 22 NOVEMBER 2026` date badge on the right, followed by 6 metric cards (`NO DEAL`, `8TH`, `3RD`, `24+`, `$31M`, `128`).
- **7-Region Coverage Bar**: Proportional distribution across Middle East (5), Europe (4), Asia (4), Americas (4), Africa (3), Oceania (3), Global (1) for 24 total verified stories.
- **Top 3 Hero Cards**:
  1. `GLOBAL · CONFIRMED`: *COP31 COLLAPSES WITHOUT DEAL* (Antalya summit ends with no overarching pact as EU, UK & others reject fossil-fuel draft).
  2. `MIDDLE EAST · OFFICIAL`: *GULF MISSILE & IRAN ESCALATION* (Saudi coalition downs missile over west; Bahrain seeks UN action; US-Israel plan response).
  3. `EUROPE · CONFIRMED`: *KYIV STRUCK; BALTIC SHIP FIRE* (Kyiv apartment struck as Finland fights Russian ship blaze & Kaliningrad sounds alert).
- **Stories 4–9 Illustrated Grid**:
  4. `EUROPE · CONFIRMED`: *MÁRQUEZ WINS 8TH MOTOGP TITLE* (Finishes P8 at Portuguese GP to tie all-time MotoGP record).
  5. `AMERICAS · CONFIRMED`: *VERSTAPPEN WINS LAS VEGAS GP* (Claims third Vegas F1 victory in four years; Ferrari collision).
  6. `AMERICAS · OFFICIAL`: *US–CHINA TECH CURB CLASH* (Beijing urges Washington to drop transceiver ban as US advances curb).
  7. `ASIA · OFFICIAL`: *S. KOREA MINISTER TO RESIGN* (Education minister steps down over AI cheating scandal; auto trade deficit).
  8. `AFRICA · REPORTED`: *NIGERIA BOAT CAPSIZES: 24+ DEAD* (At least 24 killed as funeral boat overturns; Sudan drone intercepts).
  9. `OCEANIA · OFFICIAL`: *AUSTRALIA DEFENDS AUKUS PACT* (Canberra rejects US report critique; Aus-NZ aid Bougainville).
- **Zone 6 (Bottom Split)**:
  - **Left**: Genuine Natural Earth 110m equirectangular projection world map with 125 polygon rings, 9 geocoded story pins with leader lines, and a 3×3 legend.
  - **Right**: 15 additional verified briefs (10–24) across 6 regions arranged into a clean 2-column editorial layout with news desk sources.
- **Footer Verification Strip**: Two-box panel with "HOW WE CHECKED" verification tiers (`CONFIRMED`, `OFFICIAL`, `REPORTED`) and strict full-day 22 November 2026 UTC date audit record.

## Architecture & Requirements

- `data/stories.json`: Structured news data model for all 24 verified stories across all 7 regions.
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
- **File Size**: ~636 KB (strictly < 1 MiB)
- **Format**: PNG (magic bytes `89 50 4E 47 0D 0A 1A 0A` verified)
- **Runtime Dependencies**: Zero (Node 22 built-in `node:fs`, `node:path`, `node:url` only)
- **License**: MIT
