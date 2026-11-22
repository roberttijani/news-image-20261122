# World News — Sunday 22 November 2026

[![make.fun](https://make.fun/badge/news-image-20261122.svg)](https://make.fun/bounty/news-image-20261122)
[![Rank](https://make.fun/badge/news-image-20261122/roberttijani/news-image-20261122/rank.svg)](https://make.fun/bounty/news-image-20261122)
[![Reward](https://make.fun/badge/news-image-20261122/roberttijani/news-image-20261122/reward.svg)](https://make.fun/bounty/news-image-20261122)

A deterministic Swiss Editorial front-page news digest renderer and competition entry for the [make.fun bounty "Sum up 22 November's world news in one image"](https://make.fun/bounty/news-image-20261122).

## Visual Design (Swiss Editorial Broadsheet — 32-Story Edition)

Designed in high-contrast editorial broadsheet style (inspired by *The Economist* and *Monocle*), optimized for clear readability even at 300px thumbnail view:

- **Archival Palette**: Warm archival paper (`#F7F3E9`), deep ink navy (`#0F172A`), editorial crimson (`#B91C1C`), and muted steel-blue illustration accents (`#648595`, `#9BB3BF`, `#2C4A5A`).
- **Zone 1 — Top Dark Banner & Giant Date Masthead**: Slim top navy bar with edition metadata, massive bold display serif masthead (`Sunday 22 November 2026`), and crimson italic editorial kicker.
- **Zone 2 — 6-Metric KPI Strip**: 6 bordered boxes with bold numbers + captions (`NO DEAL`, `186`, `720/9`, `98.79%`, `8TH`, `24+`).
- **Zone 3 — 7-Region Coverage Bar & Dark UTC Timeline**: Color-coded proportional stacked bar (`EUROPE 6 · MIDDLE EAST 6 · ASIA 6 · AMERICAS 6 · AFRICA 4 · OCEANIA 3 · GLOBAL 1`) and a dark navy timeline strip tracking the day's progression in UTC.
- **Zone 4 — Top 3 Hero Cards**:
  1. `GLOBAL · CONFIRMED`: *COP31 COLLAPSES WITHOUT PACT* (Antalya summit ends with no overarching pact after EU, UK & others reject draft).
  2. `EUROPE · OFFICIAL`: *186 RUSSIAN DRONES STRIKE UKRAINE* (Air defenses down 161; Dymer apartment hit as Finland fights Baltic ship blaze).
  3. `MIDDLE EAST · OFFICIAL`: *GULF MISSILE & IRAN ESCALATION* (Saudi coalition downs missile over west; Bahrain seeks UN action; US-Israel plan response).
- **Zone 5 — 10 Illustrated Grid Cards (4–13)**: 10 distinct bespoke vector SVG illustrations:
  4. `EUROPE · CONFIRMED`: *MÁRQUEZ 8TH MOTOGP TITLE* (Finishes P8 in Portugal to tie record).
  5. `AMERICAS · CONFIRMED`: *VERSTAPPEN WINS VEGAS GP* (Claims 3rd Las Vegas F1 win in 4 yrs).
  6. `ASIA/OCEANIA · CONFIRMED`: *INDIA RECORD 720/9 IN NZ* (Pant hits 128 in highest Test total in NZ).
  7. `ASIA · OFFICIAL`: *HK POLL 98.79% TURNOUT* (Record turnout in Hong Kong Election Committee vote).
  8. `AMERICAS · OFFICIAL`: *US–CHINA TECH CURB CLASH* (Beijing urges US to drop data-center transceiver ban).
  9. `ASIA · OFFICIAL`: *S. KOREA MINISTER RESIGNS* (Education chief quits over AI cheating scandal).
  10. `AFRICA · REPORTED`: *NIGERIA BOAT CAPSIZES: 24+* (At least 24 mourners killed in funeral boat accident).
  11. `OCEANIA · OFFICIAL`: *AUSTRALIA DEFENDS AUKUS* (Rejects US report critique on submarine deal).
  12. `EUROPE · CONFIRMED`: *PAOLO BULGARI DIES AT 89* (Italian luxury jewelry icon passes away).
  13. `ASIA · OFFICIAL`: *JAPAN BANS 4 CHEMICALS* (METI CSCL import ban on LC-PFCAs takes effect).
- **Zone 6 — Bottom Split**:
  - **Left**: Dark-navy ocean (`#102438`) Natural Earth 110m equirectangular projection world map with 13 geocoded story pins with leader lines, plus a red-bordered `DATE CHECK — READ THIS FIRST` panel explicitly auditing strict 22 Nov 2026 UTC adherence.
  - **Right**: 19 additional verified briefs (14–32) arranged into a balanced 2-column editorial layout with news desk sources.
- **Zone 7 — Compact Footer Bar**: Four verification tier tags (`CONFIRMED`, `OFFICIAL`, `REPORTED`, `CLAIM`) and recognized wire service Desks.

## Architecture & Requirements

- `data/stories.json`: Structured news data model for all 32 verified stories across all 7 regions.
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
- **File Size**: ~526 KB (strictly < 1 MiB)
- **Format**: PNG (magic bytes `89 50 4E 47 0D 0A 1A 0A` verified)
- **Runtime Dependencies**: Zero (Node 22 built-in `node:fs`, `node:path`, `node:url` only)
- **License**: MIT
