# World News — Sunday 22 November 2026

[![make.fun](https://make.fun/badge/news-image-20261122.svg)](https://make.fun/bounty/news-image-20261122)
[![Rank](https://make.fun/badge/news-image-20261122/roberttijani/news-image-20261122/rank.svg)](https://make.fun/bounty/news-image-20261122)
[![Reward](https://make.fun/badge/news-image-20261122/roberttijani/news-image-20261122/reward.svg)](https://make.fun/bounty/news-image-20261122)

A deterministic Swiss Editorial front-page news digest renderer and competition entry for the [make.fun bounty "Sum up 22 November's world news in one image"](https://make.fun/bounty/news-image-20261122).

## Visual Design (Swiss Editorial Broadsheet — 24-Story Full-Bleed Edition)

Designed in high-contrast editorial broadsheet style (inspired by *The Economist* and *Monocle*), optimized for clear readability and craft even at 300px thumbnail view:

- **Archival Palette**: Warm archival paper (`#F7F3E9`), pitch-dark ink navy (`#0B1220`), dark charcoal body ink (`#1F2937`), editorial crimson (`#B91C1C`), and rich full-bleed illustration backdrops.
- **Zone 1 — Top Dark Banner & Giant Date Masthead**: Slim top navy bar with edition metadata, massive bold display serif masthead (`Sunday 22 November 2026`), and crimson italic editorial kicker.
- **Zone 2 — 6-Metric KPI Strip**: 6 bordered boxes with bold numbers + captions (`NO DEAL`, `186`, `4–0`, `720/9`, `8TH`, `98.79%`).
- **Zone 3 — 7-Region Coverage Bar & Dark UTC Timeline**: Color-coded proportional stacked bar (`EUROPE 5 · ASIA 5 · MIDDLE EAST 4 · AMERICAS 4 · AFRICA 3 · OCEANIA 2 · GLOBAL 1 = 24`) and a dark navy timeline strip tracking the day's progression across 7 UTC key nodes.
- **Zone 4 — Top 3 Hero Cards**:
  1. `GLOBAL · CONFIRMED`: *COP31 COLLAPSES WITHOUT PACT* (UN climate summit ends with no deal after EU, UK & Panama reject fossil-fuel draft text).
  2. `AFRICA · REPORTED`: *DRONE SINKS RUSSIAN WARSHIP* (Suspected Ukrainian naval drone strikes and sinks Russian corvette Merkury in Benghazi port).
  3. `EUROPE · OFFICIAL`: *186 RUSSIAN DRONES HIT UKRAINE* (Air defenses down 161; Dymer hit near Kyiv; Finland fights ship blaze).
- **Zone 5 — 10 Illustrated Grid Cards (4–13)**: 10 full-bleed colorful editorial vector illustrations:
  4. `MIDDLE EAST · OFFICIAL`: *GULF DRONES & BAHRAIN UN CALL* (Saudi downs 2 drones; Bahrain urges UNSC action on Iran).
  5. `AMERICAS · REPORTED`: *TRUMP: REHIRE NVIDIA'S HUANG* (Trump calls on Nvidia board to reinstate CEO Jensen Huang).
  6. `EUROPE · CONFIRMED`: *ALCARAZ WINS 1ST ATP FINALS* (Defeats Zverev 6–2, 7–6 in Turin for maiden ATP Finals title).
  7. `EUROPE · CONFIRMED`: *LIVERPOOL ROUT MAN UTD 4–0* (Ten-man United suffer record-tying 4–0 thrashing at Anfield).
  8. `EUROPE · CONFIRMED`: *MÁRQUEZ TIES 8TH MOTOGP TITLE* (Finishes P8 in Portugal to equal Agostini's 8 premier titles).
  9. `ASIA · CONFIRMED`: *INDIA RECORD 720/9 IN NZ* (Pant's 128 powers record 720/9 in NZ; hosts 119/2 at stumps).
  10. `AMERICAS · CONFIRMED`: *VERSTAPPEN WINS LAS VEGAS GP* (Wins 3rd Vegas F1 in 4 yrs as Hamilton & Leclerc collide).
  11. `AMERICAS · CONFIRMED`: *BRAZIL STORM KILLS 5, 250+ HURT* (Supercell storm kills 5 and injures 250+ in Rio Grande do Sul).
  12. `ASIA · CONFIRMED`: *INDONESIA FIRE: 36 MISSING* (Confectionery plant fire in Serang leaves 3 dead, 36 missing).
  13. `ASIA · OFFICIAL`: *HK POLL SETS 98.79% TURNOUT* (Record HK Election Committee turnout; S. Korea minister offers to resign).
- **Zone 6 — Bottom Split**:
  - **Left**: Dark-navy ocean (`#102438`) Natural Earth 110m equirectangular projection world map with 13 geocoded story pins with leader lines, plus a red-bordered `DATE CHECK — READ THIS FIRST` panel explicitly auditing strict 22 Nov 2026 UTC adherence.
  - **Right**: 11 additional verified briefs (14–24) arranged into a spacious, high-contrast 2-column editorial layout with news desk sources.
- **Zone 7 — Compact Footer Bar**: Four verification tier tags (`CONFIRMED`, `OFFICIAL`, `REPORTED`, `CLAIM`) and recognized international wire service Desks.

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
- **File Size**: ~550 KB (strictly < 1 MiB)
- **Format**: PNG (magic bytes `89 50 4E 47 0D 0A 1A 0A` verified)
