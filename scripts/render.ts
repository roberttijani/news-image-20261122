import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as topojson from 'topojson-client';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

interface NewsData {
  date: string;
  displayDate: string;
  subtitle: string;
  keyNumbers: Array<{ value: string; label: string }>;
  regionDistribution: Array<{ region: string; code: string; count: number; color: string }>;
  topHeroes: Array<{
    id: number;
    region: string;
    regionColor: string;
    status: 'CONFIRMED' | 'OFFICIAL' | 'REPORTED';
    headline: string;
    summary: string;
    sources: string;
    location: string;
    lat: number;
    lon: number;
  }>;
  gridStories: Array<{
    id: number;
    region: string;
    regionColor: string;
    status: 'CONFIRMED' | 'OFFICIAL' | 'REPORTED';
    headline: string;
    summary: string;
    sources: string;
    location: string;
    lat: number;
    lon: number;
  }>;
  bottomStories: Array<{
    id: number;
    region: string;
    regionColor: string;
    status: 'CONFIRMED' | 'OFFICIAL' | 'REPORTED';
    lead: string;
    body: string;
    source: string;
  }>;
}

function loadStories(): NewsData {
  const dataPath = resolve(rootDir, 'data', 'stories.json');
  return JSON.parse(readFileSync(dataPath, 'utf-8')) as NewsData;
}

function esc(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Master Color Palette — Swiss Editorial Broadside
const C = {
  paper: '#F6F3EC',
  cardBg: '#FAF8F3',
  cardMuted: '#EFECE4',
  cardBorder: '#D8D3C5',
  cardBorderSubtle: '#E8E3D7',
  inkNavy: '#0F172A',
  charcoal: '#334155',
  mutedSlate: '#64748B',
  divider: '#D1C9B8',
  dividerHeavy: '#0F172A',
  crimson: '#B91C1C',
  crimsonBright: '#DC2626',
  crimsonLight: '#FECACA',
  // Steel editorial illustration palette
  steelDark: '#2C4A5A',
  steelMid: '#648595',
  steelLight: '#9BB3BF',
  steelPale: '#D2DFE6',
  // Regional Accents (Exact from specification)
  regGlobal: '#1E3A5F',
  regMidEast: '#B91C1C',
  regEurope: '#1D4ED8',
  regAmericas: '#9A3412',
  regAsia: '#0F766E',
  regAfrica: '#A16207',
  regOceania: '#6D28D9',
  // Map Palette
  ocean: '#DFE7EC',
  land: '#D1DCD4',
  landStroke: '#A8BCB0',
};

function renderStatusBadge(status: 'CONFIRMED' | 'OFFICIAL' | 'REPORTED', fontSize = 7.5): string {
  const cfg = {
    CONFIRMED: { bg: '#1B4332', text: '#FFFFFF', label: 'CONFIRMED' },
    OFFICIAL: { bg: C.crimson, text: '#FFFFFF', label: 'OFFICIAL' },
    REPORTED: { bg: '#334155', text: '#FFFFFF', label: 'REPORTED' },
  }[status];

  const w = status === 'CONFIRMED' ? fontSize * 7.5 : status === 'REPORTED' ? fontSize * 6.8 : fontSize * 5.8;
  const h = fontSize + 6;

  return `
    <rect width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2.5" fill="${cfg.bg}"/>
    <text x="${(w / 2).toFixed(1)}" y="${(h - 3.8).toFixed(1)}" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="${cfg.text}" letter-spacing="0.6">${cfg.label}</text>
  `;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ============================================================================
// NATURAL EARTH WORLD MAP GENERATION
// ============================================================================
function generateWorldMapPath(
  mapLeft: number,
  mapTop: number,
  mapWidth: number,
  mapHeight: number
): { pathData: string; project: (lon: number, lat: number) => [number, number] } {
  const landPath = resolve(rootDir, 'node_modules', 'world-atlas', 'land-110m.json');
  const landTopology = JSON.parse(readFileSync(landPath, 'utf-8'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const land = topojson.feature(landTopology, (landTopology as any).objects.land);

  const minLon = -180;
  const maxLon = 180;
  const minLat = -56;
  const maxLat = 80;

  function project(lon: number, lat: number): [number, number] {
    const clampedLon = Math.max(minLon, Math.min(maxLon, lon));
    const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
    const x = mapLeft + ((clampedLon - minLon) / (maxLon - minLon)) * mapWidth;
    const y = mapTop + ((maxLat - clampedLat) / (maxLat - minLat)) * mapHeight;
    return [Number(x.toFixed(1)), Number(y.toFixed(1))];
  }

  let pathData = '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coords = (land as any).features[0].geometry.coordinates;
  for (const poly of coords) {
    for (const ring of poly) {
      if (ring.length < 3) continue;
      const [startX, startY] = project(ring[0][0], ring[0][1]);
      pathData += `M ${startX},${startY} `;
      for (let i = 1; i < ring.length; i++) {
        const [px, py] = project(ring[i][0], ring[i][1]);
        pathData += `L ${px},${py} `;
      }
      pathData += 'Z ';
    }
  }

  return { pathData, project };
}

// ============================================================================
// 9 BESPOKE EDITORIAL VECTOR ILLUSTRATIONS (ZERO FLOATING TEXT)
// ============================================================================

// 1. COP31 Antalya Summit Collapses: Pavilion, Climate Globe & Fractured Gavel
function renderIllustration1(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Mediterranean Mountain Ridgeline -->
    <path d="M 0,${h - 18} L 45,${h - 48} L 95,${h - 32} L 155,${h - 58} L 210,${h - 35} L ${w},${h - 20} L ${w},${h} L 0,${h} Z" fill="#DDE4EA"/>
    <polygon points="155,${h - 58} 165,${h - 46} 145,${h - 46}" fill="#FFFFFF" opacity="0.9"/>
    <!-- Coastline Water -->
    <rect x="0" y="${h - 18}" width="${w}" height="18" fill="#D2DFE6"/>
    <line x1="8" y1="${h - 10}" x2="${w - 8}" y2="${h - 10}" stroke="#9BB3BF" stroke-width="1" stroke-dasharray="8,5"/>
    
    <!-- Modern Cantilever Summit Hall -->
    <polygon points="14,${h - 18} 150,${h - 18} 165,${h - 6} 6,${h - 6}" fill="${C.steelDark}"/>
    <polygon points="20,${h - 58} 135,${h - 70} 148,${h - 46} 36,${h - 36}" fill="${C.steelDark}"/>
    <polygon points="28,${h - 60} 140,${h - 72} 145,${h - 63} 34,${h - 52}" fill="${C.steelMid}"/>
    <!-- Glass Facade & Columns -->
    <polygon points="36,${h - 36} 148,${h - 46} 144,${h - 18} 32,${h - 18}" fill="#C8D8E2" opacity="0.85"/>
    <line x1="58" y1="${h - 38}" x2="54" y2="${h - 18}" stroke="${C.steelDark}" stroke-width="2"/>
    <line x1="86" y1="${h - 41}" x2="82" y2="${h - 18}" stroke="${C.steelDark}" stroke-width="2"/>
    <line x1="114" y1="${h - 44}" x2="110" y2="${h - 18}" stroke="${C.steelDark}" stroke-width="2"/>
    <!-- Flags atop roof -->
    <line x1="26" y1="${h - 58}" x2="26" y2="${h - 78}" stroke="${C.inkNavy}" stroke-width="1.5"/>
    <polygon points="26,${h - 78} 38,${h - 74} 26,${h - 70}" fill="${C.crimson}"/>
    <line x1="68" y1="${h - 64}" x2="68" y2="${h - 82}" stroke="${C.inkNavy}" stroke-width="1.5"/>
    <polygon points="68,${h - 82} 80,${h - 78} 68,${h - 74}" fill="${C.steelMid}"/>

    <!-- Stylized COP31 Climate Globe (Center-Right) -->
    <g transform="translate(196, 38)">
      <circle cx="0" cy="0" r="22" fill="#E2EBF0" stroke="${C.steelDark}" stroke-width="1.5"/>
      <line x1="-22" y1="0" x2="22" y2="0" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="0" y1="-22" x2="0" y2="22" stroke="${C.steelMid}" stroke-width="1"/>
      <ellipse cx="0" cy="-10" rx="19" ry="5.5" fill="none" stroke="${C.steelMid}" stroke-width="0.9"/>
      <ellipse cx="0" cy="10" rx="19" ry="5.5" fill="none" stroke="${C.steelMid}" stroke-width="0.9"/>
      <ellipse cx="0" cy="0" rx="11" ry="22" fill="none" stroke="${C.steelMid}" stroke-width="1"/>
      <!-- Antalya Crimson Alert Beacon -->
      <circle cx="5" cy="-7" r="3" fill="${C.crimson}"/>
      <circle cx="5" cy="-7" r="5.5" fill="none" stroke="${C.crimson}" stroke-width="0.8" opacity="0.6"/>
    </g>

    <!-- Talks Collapse Motif: Fractured Conference Gavel & Sound Block (Far Right) -->
    <g transform="translate(262, 42)">
      <!-- Sound Block Base -->
      <rect x="-14" y="14" width="28" height="6" rx="1.5" fill="${C.steelDark}"/>
      <ellipse cx="0" cy="14" rx="14" ry="3" fill="${C.steelMid}"/>
      <!-- Fractured Gavel Head -->
      <g transform="rotate(-24)">
        <polygon points="-12,-6 12,-6 10,6 -10,6" fill="${C.crimson}"/>
        <rect x="-3" y="6" width="6" height="4" rx="1" fill="${C.steelDark}"/>
        <!-- Split Handle with Angular Fracture -->
        <path d="M 0,-6 L -3,-18" stroke="${C.steelDark}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M -1,-22 L 5,-32" stroke="${C.steelDark}" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Crimson Fracture Spark -->
        <polygon points="-2,-20 2,-18 -1,-16 -4,-18" fill="${C.crimsonBright}"/>
      </g>
    </g>
  `;
}

// 2. Gulf Air Defense & Iran Escalation: Radar Battery, Trajectory & Deflection
function renderIllustration2(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Desert Dune Strata -->
    <path d="M 0,${h - 16} Q 80,${h - 28} 160,${h - 20} T ${w},${h - 22} L ${w},${h} L 0,${h} Z" fill="#DDD5C2"/>
    <!-- Geodesic Radar Dome Battery -->
    <g transform="translate(42, ${h - 22})">
      <rect x="-26" y="-6" width="52" height="6" fill="${C.steelDark}" rx="1.5"/>
      <path d="M -22,-6 A 22 22 0 0 1 22,-6 Z" fill="${C.steelDark}"/>
      <path d="M -16,-6 A 16 16 0 0 1 16,-6" fill="none" stroke="${C.steelMid}" stroke-width="1.2"/>
      <line x1="0" y1="-28" x2="0" y2="-6" stroke="${C.steelMid}" stroke-width="1.4"/>
      <!-- Elevated Missile Launcher Tubes -->
      <g transform="translate(32, -6)">
        <polygon points="-4,-4 8,-22 13,-20 0,-2" fill="${C.inkNavy}"/>
        <circle cx="10.5" cy="-21" r="1.5" fill="${C.crimson}"/>
      </g>
    </g>
    <!-- Radar Wave Rings -->
    <path d="M 42,${h - 42} A 55 55 0 0 1 97,${h - 70}" fill="none" stroke="#9BB3BF" stroke-width="1.2" stroke-dasharray="3,3"/>
    <path d="M 42,${h - 42} A 95 95 0 0 1 137,${h - 90}" fill="none" stroke="#9BB3BF" stroke-width="1.2" stroke-dasharray="4,4"/>
    <!-- Inbound Hostile Missile Trajectory -->
    <path d="M ${w - 18},16 Q ${w - 55},42 ${w - 95},56" fill="none" stroke="${C.inkNavy}" stroke-width="1.5" stroke-dasharray="4,2"/>
    <!-- Crimson Interceptor Arc -->
    <path d="M 48,${h - 46} Q 105,24 ${w - 95},56" fill="none" stroke="${C.crimson}" stroke-width="2.6"/>
    <!-- Kinetic Starburst Impact Point -->
    <g transform="translate(${w - 95}, 56)">
      <circle cx="0" cy="0" r="15" fill="${C.crimsonLight}" opacity="0.6"/>
      <circle cx="0" cy="0" r="8" fill="${C.crimson}" opacity="0.4"/>
      <circle cx="0" cy="0" r="3" fill="${C.crimson}"/>
      <line x1="-12" y1="0" x2="12" y2="0" stroke="${C.crimson}" stroke-width="2"/>
      <line x1="0" y1="-12" x2="0" y2="12" stroke="${C.crimson}" stroke-width="2"/>
    </g>
    <!-- Deflected Missile Silhouette -->
    <g transform="translate(${w - 74}, 40) rotate(-42)">
      <polygon points="0,-14 4,2 2,12 -2,12 -4,2" fill="${C.inkNavy}"/>
      <polygon points="2,5 7,12 2,10" fill="${C.steelDark}"/>
      <polygon points="-2,5 -7,12 -2,10" fill="${C.steelDark}"/>
    </g>
    <!-- Naval Air-Defense Silhouette (Far Left) -->
    <g transform="translate(138, ${h - 22})">
      <line x1="0" y1="0" x2="0" y2="-18" stroke="${C.steelDark}" stroke-width="1.2"/>
      <line x1="-6" y1="-12" x2="6" y2="-12" stroke="${C.steelDark}" stroke-width="1"/>
      <circle cx="0" cy="-18" r="2" fill="${C.steelMid}"/>
    </g>
  `;
}

// 3. Kyiv Strike & Baltic Cargo Ship Fire: Urban Grid, Vessel & Flames
function renderIllustration3(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    
    <!-- LEFT: Kyiv Urban Residential Block with Strike Blast -->
    <g transform="translate(14, 12)">
      <!-- Apartment Building Facade -->
      <rect x="0" y="4" width="56" height="58" rx="2" fill="${C.steelDark}" stroke="${C.inkNavy}" stroke-width="1.2"/>
      <!-- Window Matrix Grid -->
      ${[0, 1, 2, 3].map(row => 
        [0, 1, 2].map(col => `
          <rect x="${6 + col * 16}" y="${10 + row * 12}" width="10" height="7" rx="1" fill="#E2EBF0" opacity="${row === 1 && col === 2 ? '0.3' : '0.85'}"/>
        `).join('')
      ).join('')}
      <!-- Blast Impact / Breach on Top-Right Corner -->
      <polygon points="42,4 56,4 56,22 46,18 42,12" fill="${C.cardMuted}"/>
      <!-- Impact Alert Rings -->
      <circle cx="50" cy="14" r="8" fill="none" stroke="${C.crimson}" stroke-width="1.4" stroke-dasharray="2,2"/>
      <circle cx="50" cy="14" r="3.5" fill="${C.crimson}"/>
      <!-- Telecom Mast on Roof -->
      <line x1="16" y1="4" x2="16" y2="-6" stroke="${C.inkNavy}" stroke-width="1.5"/>
      <line x1="11" y1="-2" x2="21" y2="-2" stroke="${C.steelMid}" stroke-width="1"/>
    </g>

    <!-- Subtle Dividing Demarcation -->
    <line x1="88" y1="10" x2="88" y2="${h - 10}" stroke="${C.divider}" stroke-width="0.8" stroke-dasharray="3,3"/>

    <!-- RIGHT: Baltic Sea Waters & Burning Cargo Ship -->
    <g transform="translate(98, 0)">
      <!-- Cold Baltic Sea Waves -->
      <path d="M 0,${h - 16} Q 40,${h - 24} 80,${h - 17} T 190,${h - 18} L 190,${h} L 0,${h} Z" fill="${C.steelDark}"/>
      <path d="M 0,${h - 16} Q 40,${h - 24} 80,${h - 17} T 190,${h - 18}" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.6"/>

      <!-- Commercial Cargo Freighter Hull -->
      <g transform="translate(16, ${h - 22})">
        <!-- Hull Profile -->
        <polygon points="0,-4 135,-4 148,-14 154,-14 150,2 10,2" fill="${C.inkNavy}"/>
        <rect x="12" y="-12" width="22" height="8" fill="${C.steelMid}"/>
        <rect x="18" y="-18" width="10" height="6" fill="${C.steelDark}"/>
        <line x1="23" y1="-18" x2="23" y2="-24" stroke="${C.steelDark}" stroke-width="1.2"/>
        
        <!-- Deck Shipping Containers (Steel Blue & Charcoal) -->
        <rect x="42" y="-12" width="16" height="8" rx="0.8" fill="${C.steelMid}" stroke="${C.steelDark}" stroke-width="0.6"/>
        <rect x="60" y="-12" width="16" height="8" rx="0.8" fill="${C.steelLight}" stroke="${C.steelDark}" stroke-width="0.6"/>
        <rect x="78" y="-12" width="16" height="8" rx="0.8" fill="${C.charcoal}" stroke="${C.inkNavy}" stroke-width="0.6"/>
        
        <!-- Burning Container Stacks (Deck Center) -->
        <rect x="96" y="-14" width="16" height="10" rx="0.8" fill="${C.charcoal}"/>
        <rect x="114" y="-12" width="16" height="8" rx="0.8" fill="${C.steelDark}"/>
        
        <!-- Stylized Crimson/Orange Fire Tongues -->
        <path d="M 100,-14 Q 104,-28 108,-18 Q 112,-32 116,-16 Q 120,-26 124,-14 Z" fill="${C.crimson}"/>
        <path d="M 104,-14 Q 107,-24 110,-17 Q 113,-26 117,-14 Z" fill="#F59E0B" opacity="0.9"/>
        
        <!-- Rising Billowing Smoke Plumes -->
        <circle cx="106" cy="-28" r="7" fill="#64748B" opacity="0.6"/>
        <circle cx="118" cy="-34" r="9" fill="#94A3B8" opacity="0.5"/>
        <circle cx="130" cy="-42" r="11" fill="#CBD5E1" opacity="0.4"/>
      </g>

      <!-- Finnish Rescue Cutter Light Beacon -->
      <g transform="translate(182, 18)">
        <polygon points="0,0 -35,28 -15,35" fill="#FFF8DC" opacity="0.4"/>
        <circle cx="0" cy="0" r="2.5" fill="${C.crimson}"/>
      </g>
    </g>
  `;
}

// 4. Marc Márquez Clinches 8th MotoGP World Title: Portimão Kerb & Racing Superbike
function renderIllustration4(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    
    <!-- Autódromo do Algarve Curving Asphalt Track -->
    <path d="M 0,${h - 8} Q 35,${h - 32} 55,20 L 75,12 Q 52,${h - 24} 12,${h} Z" fill="#334155"/>
    
    <!-- Red & White Alternating Racing Kerb (Rumble Strips) -->
    <g transform="translate(0, 0)">
      <polygon points="0,${h - 14} 8,${h - 20} 14,${h - 18} 4,${h - 10}" fill="${C.crimson}"/>
      <polygon points="8,${h - 20} 16,${h - 28} 22,${h - 25} 14,${h - 18}" fill="#FFFFFF"/>
      <polygon points="16,${h - 28} 25,${h - 38} 31,${h - 34} 22,${h - 25}" fill="${C.crimson}"/>
      <polygon points="25,${h - 38} 34,${h - 50} 40,${h - 46} 31,${h - 34}" fill="#FFFFFF"/>
      <polygon points="34,${h - 50} 43,${h - 64} 49,${h - 60} 40,${h - 46}" fill="${C.crimson}"/>
      <polygon points="43,${h - 64} 52,${h - 80} 58,${h - 76} 49,${h - 60}" fill="#FFFFFF"/>
    </g>

    <!-- Leaning MotoGP Racing Prototype Superbike & Rider (Deep Apex Tuck) -->
    <g transform="translate(26, ${h - 44}) rotate(-28)">
      <!-- Rear Slick Tyre -->
      <ellipse cx="-16" cy="2" rx="7" ry="4.5" fill="${C.inkNavy}"/>
      <ellipse cx="-16" cy="2" rx="4" ry="2.5" fill="${C.steelDark}"/>
      <!-- Front Slick Tyre -->
      <ellipse cx="18" cy="-4" rx="7" ry="4.5" fill="${C.inkNavy}"/>
      <ellipse cx="18" cy="-4" rx="4" ry="2.5" fill="${C.steelDark}"/>
      <!-- Motorcycle Chassis & Aerodynamic Fairing -->
      <polygon points="-12,0 4,-2 14,-6 8,-12 -4,-10" fill="${C.crimson}"/>
      <polygon points="-4,-10 6,-11 12,-6 -2,-4" fill="${C.steelDark}"/>
      <!-- Aerodynamic Downforce Winglets -->
      <polygon points="10,-8 16,-9 14,-6" fill="${C.inkNavy}"/>
      <!-- Low Slung Exhaust -->
      <line x1="-12" y1="2" x2="-2" y2="1" stroke="${C.steelMid}" stroke-width="1.8"/>
      <!-- Rider in Deep Lean / Knee-Down Puck -->
      <circle cx="-1" cy="-14" r="5" fill="${C.inkNavy}"/>
      <polygon points="-6,-10 2,-11 5,-7 -2,-5" fill="${C.crimson}"/>
      <!-- Knee Puck scraping kerb -->
      <ellipse cx="3" cy="2" rx="2.5" ry="1.5" fill="#FFFFFF"/>
    </g>

    <!-- Championship Laurels & Trophy Emblem (Top-Right) -->
    <g transform="translate(${w - 24}, 26)">
      <!-- Pedestal Trophy Cup -->
      <polygon points="-5,-4 5,-4 3,4 -3,4" fill="${C.crimson}"/>
      <rect x="-1.5" y="4" width="3" height="4" fill="${C.steelDark}"/>
      <rect x="-4" y="8" width="8" height="2" fill="${C.steelDark}"/>
      <path d="M -5,-2 C -8,-2 -8,2 -5,2" fill="none" stroke="${C.crimson}" stroke-width="0.8"/>
      <path d="M 5,-2 C 8,-2 8,2 5,2" fill="none" stroke="${C.crimson}" stroke-width="0.8"/>
      
      <!-- Twin Laurel Wreath Branches -->
      <path d="M -9,8 C -14,2 -13,-6 -7,-12" fill="none" stroke="${C.steelMid}" stroke-width="1.2"/>
      <path d="M 9,8 C 14,2 13,-6 7,-12" fill="none" stroke="${C.steelMid}" stroke-width="1.2"/>
      <!-- Leaves -->
      <circle cx="-11" cy="3" r="1.5" fill="${C.steelMid}"/>
      <circle cx="-11" cy="-3" r="1.5" fill="${C.steelMid}"/>
      <circle cx="-8" cy="-8" r="1.5" fill="${C.steelMid}"/>
      <circle cx="11" cy="3" r="1.5" fill="${C.steelMid}"/>
      <circle cx="11" cy="-3" r="1.5" fill="${C.steelMid}"/>
      <circle cx="8" cy="-8" r="1.5" fill="${C.steelMid}"/>
    </g>
  `;
}

// 5. Verstappen Wins Las Vegas GP: Neon Skyline, F1 Car & Checkered Flag
function renderIllustration5(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    
    <!-- Midnight Strip Skyline Backdrop -->
    <!-- Luxor Pyramid & Sky Beam -->
    <polygon points="12,46 32,18 52,46" fill="#CBD5E1"/>
    <polygon points="30,18 34,18 38,0 26,0" fill="#FFF8DC" opacity="0.6"/>
    <!-- Vegas Neon Diamond Sign Silhouette -->
    <polygon points="66,16 75,24 66,32 57,24" fill="none" stroke="${C.crimson}" stroke-width="1.4"/>
    <circle cx="66" cy="24" r="2" fill="${C.crimson}"/>
    <!-- Observation Wheel Outline -->
    <circle cx="78" cy="42" r="14" fill="none" stroke="${C.steelLight}" stroke-width="1" stroke-dasharray="2,2"/>
    <line x1="78" y1="42" x2="78" y2="56" stroke="${C.steelMid}" stroke-width="1.2"/>

    <!-- Track Asphalt Surface -->
    <rect x="0" y="${h - 40}" width="${w}" height="40" fill="#334155"/>
    <line x1="0" y1="${h - 20}" x2="${w}" y2="${h - 20}" stroke="#FFFFFF" stroke-width="1.2" stroke-dasharray="8,6" opacity="0.6"/>

    <!-- Formula 1 Open-Wheel Race Car (Dynamic 3/4 Front View) -->
    <g transform="translate(18, ${h - 26})">
      <!-- Wide Rear Slick Tyres -->
      <rect x="0" y="-12" width="8" height="15" rx="2" fill="${C.inkNavy}"/>
      <rect x="42" y="-12" width="8" height="15" rx="2" fill="${C.inkNavy}"/>
      <!-- Low Aerodynamic Monocoque Body -->
      <polygon points="4,0 46,0 36,-6 14,-6" fill="${C.steelDark}"/>
      <polygon points="16,-6 34,-6 28,-14 22,-14" fill="${C.inkNavy}"/>
      <!-- Driver Helmet & Halo Safety Loop -->
      <circle cx="25" cy="-11" r="3" fill="#F59E0B"/>
      <path d="M 20,-11 C 20,-16 30,-16 30,-11" fill="none" stroke="${C.steelLight}" stroke-width="1.5"/>
      <!-- Front Nosecone & Wing Assembly -->
      <polygon points="21,0 29,0 27,10 23,10" fill="${C.steelDark}"/>
      <rect x="10" y="8" width="30" height="3" rx="0.8" fill="${C.crimson}"/>
      <!-- Front Slick Tyres -->
      <rect x="7" y="3" width="6" height="11" rx="1.5" fill="${C.inkNavy}"/>
      <rect x="37" y="3" width="6" height="11" rx="1.5" fill="${C.inkNavy}"/>
    </g>

    <!-- Waving Checkered Victory Flag (Top-Right) -->
    <g transform="translate(${w - 22}, 18)">
      <line x1="-10" y1="0" x2="-10" y2="34" stroke="${C.inkNavy}" stroke-width="1.5"/>
      <g transform="translate(-10, 0)">
        <rect x="0" y="0" width="5" height="5" fill="${C.inkNavy}"/>
        <rect x="5" y="0" width="5" height="5" fill="#FFFFFF"/>
        <rect x="10" y="0" width="5" height="5" fill="${C.inkNavy}"/>
        <rect x="0" y="5" width="5" height="5" fill="#FFFFFF"/>
        <rect x="5" y="5" width="5" height="5" fill="${C.crimson}"/>
        <rect x="10" y="5" width="5" height="5" fill="#FFFFFF"/>
        <rect x="0" y="10" width="5" height="5" fill="${C.inkNavy}"/>
        <rect x="5" y="10" width="5" height="5" fill="#FFFFFF"/>
        <rect x="10" y="10" width="5" height="5" fill="${C.inkNavy}"/>
      </g>
    </g>
  `;
}

// 6. US–China Tech Curb Clash: Server Rack, Optical Transceiver & Blocked Trace
function renderIllustration6(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    
    <!-- Top: Datacenter Server Blade Chassis -->
    <g transform="translate(10, 10)">
      <rect x="0" y="0" width="${w - 20}" height="32" rx="2.5" fill="${C.inkNavy}"/>
      <rect x="3" y="3" width="${w - 26}" height="26" rx="1.5" fill="${C.steelDark}"/>
      <!-- Server Slots -->
      ${[0, 1].map(row => `
        <rect x="6" y="${6 + row * 11}" width="${w - 38}" height="8" rx="1" fill="${C.inkNavy}" stroke="${C.steelMid}" stroke-width="0.6"/>
        <circle cx="12" cy="${10 + row * 11}" r="1.5" fill="${row === 0 ? '#10B981' : C.crimson}"/>
        <circle cx="18" cy="${10 + row * 11}" r="1.5" fill="${C.steelLight}"/>
        <line x1="24" y1="${10 + row * 11}" x2="${w - 46}" y2="${10 + row * 11}" stroke="${C.steelMid}" stroke-width="1" stroke-dasharray="3,2"/>
      `).join('')}
    </g>

    <!-- Center: Optical Transceiver Package (QSFP-DD Form Factor) -->
    <g transform="translate(${w / 2 - 18}, 48)">
      <rect x="0" y="0" width="36" height="24" rx="2" fill="${C.steelDark}" stroke="${C.inkNavy}" stroke-width="1.2"/>
      <rect x="4" y="4" width="28" height="16" fill="${C.cardBg}"/>
      <!-- Optical Emitter Core -->
      <circle cx="18" cy="12" r="4.5" fill="${C.crimson}"/>
      <circle cx="18" cy="12" r="2" fill="#FFFFFF"/>
      <!-- Gold Connector Pins -->
      <line x1="8" y1="24" x2="8" y2="28" stroke="#F59E0B" stroke-width="1.2"/>
      <line x1="14" y1="24" x2="14" y2="28" stroke="#F59E0B" stroke-width="1.2"/>
      <line x1="22" y1="24" x2="22" y2="28" stroke="#F59E0B" stroke-width="1.2"/>
      <line x1="28" y1="24" x2="28" y2="28" stroke="#F59E0B" stroke-width="1.2"/>
    </g>

    <!-- Bottom: Circuit Bus & Blocked Trace -->
    <g transform="translate(10, 80)">
      <!-- Unrestricted Trace -->
      <path d="M 0,6 H 24 V 16 H 70" fill="none" stroke="${C.steelMid}" stroke-width="1.5"/>
      <circle cx="24" cy="16" r="2.5" fill="${C.steelMid}"/>
      <!-- Blocked Trace with Crimson Lockout Node -->
      <path d="M 0,18 H 36" fill="none" stroke="${C.crimson}" stroke-width="1.8" stroke-dasharray="3,2"/>
      <g transform="translate(42, 18)">
        <circle cx="0" cy="0" r="5" fill="${C.crimson}"/>
        <line x1="-3" y1="-3" x2="3" y2="3" stroke="#FFFFFF" stroke-width="1.2"/>
        <line x1="3" y1="-3" x2="-3" y2="3" stroke="#FFFFFF" stroke-width="1.2"/>
      </g>
      <path d="M 48,18 H ${w - 20}" fill="none" stroke="${C.charcoal}" stroke-width="1.2" stroke-dasharray="2,3"/>
    </g>
  `;
}

// 7. S. Korea Minister to Resign: Seoul Portico, AI Exam Network & Ministerial Seal
function renderIllustration7(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    
    <!-- Top: Seoul Ministry Portico Architecture -->
    <g transform="translate(14, 12)">
      <!-- Triangular Pediment -->
      <polygon points="0,12 31,0 62,12" fill="${C.steelDark}"/>
      <rect x="2" y="12" width="58" height="3" fill="${C.steelMid}"/>
      <!-- 4 Fluted Pillars -->
      <rect x="5" y="15" width="6" height="22" fill="#E2EBF0" stroke="${C.steelDark}" stroke-width="1"/>
      <rect x="20" y="15" width="6" height="22" fill="#E2EBF0" stroke="${C.steelDark}" stroke-width="1"/>
      <rect x="36" y="15" width="6" height="22" fill="#E2EBF0" stroke="${C.steelDark}" stroke-width="1"/>
      <rect x="51" y="15" width="6" height="22" fill="#E2EBF0" stroke="${C.steelDark}" stroke-width="1"/>
      <!-- Base Plinth -->
      <rect x="0" y="37" width="62" height="4" fill="${C.steelDark}"/>
    </g>

    <!-- Center-Right: AI Exam Cheating Neural Lattice -->
    <g transform="translate(14, 58)">
      <!-- Digital Grid / Exam Paper Matrix -->
      <rect x="0" y="0" width="34" height="42" rx="2" fill="${C.cardBg}" stroke="${C.steelMid}" stroke-width="1"/>
      <!-- Exam Answer Grid Lines -->
      <line x1="4" y1="8" x2="18" y2="8" stroke="${C.steelLight}" stroke-width="1"/>
      <line x1="4" y1="16" x2="18" y2="16" stroke="${C.steelLight}" stroke-width="1"/>
      <line x1="4" y1="24" x2="18" y2="24" stroke="${C.steelLight}" stroke-width="1"/>
      <line x1="4" y1="32" x2="18" y2="32" stroke="${C.steelLight}" stroke-width="1"/>
      <!-- Neural Network Nodes Intersecting Paper -->
      <circle cx="24" cy="8" r="2.5" fill="${C.steelDark}"/>
      <circle cx="28" cy="20" r="2.5" fill="${C.steelDark}"/>
      <circle cx="22" cy="32" r="3" fill="${C.crimson}"/>
      <line x1="24" y1="8" x2="28" y2="20" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="28" y1="20" x2="22" y2="32" stroke="${C.crimson}" stroke-width="1.2"/>
      <!-- Crimson Flagged Anomaly Ring -->
      <circle cx="22" cy="32" r="5.5" fill="none" stroke="${C.crimson}" stroke-width="0.8" stroke-dasharray="2,1.5"/>
    </g>

    <!-- Right: Resignation Document & Red Ministerial Stamp -->
    <g transform="translate(56, 62)">
      <!-- Ministerial Document / Folded Letter -->
      <polygon points="0,0 24,0 24,32 6,32 0,26" fill="#F4F8FA" stroke="${C.steelDark}" stroke-width="1.2"/>
      <polygon points="0,26 6,26 6,32" fill="${C.steelMid}"/>
      <!-- Text Lines -->
      <line x1="4" y1="6" x2="20" y2="6" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="4" y1="12" x2="18" y2="12" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="4" y1="18" x2="16" y2="18" stroke="${C.steelMid}" stroke-width="1"/>
      <!-- Official Crimson Resignation Seal Stamp -->
      <circle cx="16" cy="24" r="5" fill="${C.crimson}"/>
      <rect x="13.5" y="21.5" width="5" height="5" fill="#FFFFFF"/>
    </g>
  `;
}

// 8. Nigeria Boat Capsizes: Solemn Ocean Swells & Overturned Vessel
function renderIllustration8(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Dusk Sky Horizon -->
    <rect x="1" y="1" width="${w - 2}" height="${h * 0.42}" fill="#E4DED0" rx="3"/>
    <!-- Distant Rescue Beacon Beam -->
    <polygon points="${w - 18},12 18,${h * 0.42} 48,${h * 0.42}" fill="#FFF8DC" opacity="0.45"/>
    <circle cx="${w - 18}" cy="12" r="2.5" fill="${C.crimson}"/>
    <line x1="${w - 18}" y1="12" x2="${w - 18}" y2="${h * 0.42}" stroke="${C.steelDark}" stroke-width="1.5"/>
    <!-- Swell Layer 1 -->
    <path d="M 0,${h * 0.42} Q 25,${h * 0.35} 55,${h * 0.44} T ${w},${h * 0.40} L ${w},${h} L 0,${h} Z" fill="#9BB3BF"/>
    <path d="M 0,${h * 0.42} Q 25,${h * 0.35} 55,${h * 0.44} T ${w},${h * 0.40}" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.7"/>
    <!-- Swell Layer 2 -->
    <path d="M 0,${h * 0.58} Q 32,${h * 0.48} 68,${h * 0.60} T ${w},${h * 0.54} L ${w},${h} L 0,${h} Z" fill="#648595"/>
    <path d="M 0,${h * 0.58} Q 32,${h * 0.48} 68,${h * 0.60} T ${w},${h * 0.54}" fill="none" stroke="#FFFFFF" stroke-width="1.4" opacity="0.85"/>
    <!-- Capsized Wooden Ferry Boat Silhouette -->
    <g transform="translate(46, ${h * 0.52}) rotate(26)">
      <path d="M -22,0 L 20,-3 L 24,7 L -18,6 Z" fill="${C.inkNavy}"/>
      <line x1="-12" y1="0" x2="-12" y2="-8" stroke="${C.inkNavy}" stroke-width="1.5"/>
      <line x1="0" y1="-1" x2="0" y2="-9" stroke="${C.inkNavy}" stroke-width="1.5"/>
      <line x1="12" y1="-2" x2="12" y2="-9" stroke="${C.inkNavy}" stroke-width="1.5"/>
      <line x1="-15" y1="-8" x2="15" y2="-10" stroke="${C.inkNavy}" stroke-width="1.8"/>
      <circle cx="23" cy="2" r="2" fill="#FFFFFF" opacity="0.9"/>
    </g>
    <!-- Foreground Water & Lifebuoy -->
    <path d="M 0,${h * 0.76} Q 38,${h * 0.66} 75,${h * 0.78} T ${w},${h * 0.72} L ${w},${h} L 0,${h} Z" fill="#2C4A5A"/>
    <circle cx="${w - 20}" cy="${h - 16}" r="7" fill="none" stroke="${C.crimson}" stroke-width="2.5"/>
    <circle cx="${w - 20}" cy="${h - 16}" r="3" fill="${C.steelDark}"/>
  `;
}

// 9. Australia Rejects AUKUS Critique: Surfaced Submarine, Waves & Parliament Spire
function renderIllustration9(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    
    <!-- Background: Canberra Parliament House Flagpole Spire Silhouette -->
    <g transform="translate(62, 16)">
      <!-- Sloping Hill Grassline -->
      <path d="M -40,32 Q -10,24 20,32" fill="none" stroke="${C.steelMid}" stroke-width="1"/>
      <!-- Triangular Stainless Steel Mast -->
      <polygon points="0,0 2,24 -2,24" fill="${C.steelDark}"/>
      <line x1="-12" y1="24" x2="0" y2="4" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="12" y1="24" x2="0" y2="4" stroke="${C.steelMid}" stroke-width="1"/>
      <!-- Top Flag -->
      <polygon points="0,0 8,3 0,6" fill="${C.crimson}"/>
    </g>

    <!-- Rolling Pacific Ocean Swell Layers -->
    <path d="M 0,56 Q 30,48 55,56 T ${w},52 L ${w},${h} L 0,${h} Z" fill="#9BB3BF"/>
    <path d="M 0,68 Q 25,62 50,70 T ${w},66 L ${w},${h} L 0,${h} Z" fill="#648595"/>
    
    <!-- Surfaced Nuclear-Powered Attack Submarine (AUKUS SSN) -->
    <g transform="translate(10, 64)">
      <!-- Submarine Hull -->
      <path d="M 0,10 Q 12,2 40,2 L 60,3 Q 68,5 72,12 L 0,12 Z" fill="${C.inkNavy}"/>
      <!-- Conning Tower / Sail -->
      <polygon points="26,2 32,-8 40,-8 42,2" fill="${C.inkNavy}"/>
      <!-- Periscope & Sensor Masts -->
      <line x1="34" y1="-8" x2="34" y2="-14" stroke="${C.steelDark}" stroke-width="1.2"/>
      <line x1="38" y1="-8" x2="38" y2="-12" stroke="${C.steelDark}" stroke-width="1"/>
      <!-- Hydrofoil Bow Diving Planes -->
      <line x1="16" y1="6" x2="24" y2="6" stroke="${C.steelMid}" stroke-width="1.6"/>
      <!-- Frothing Bow Wave Wake -->
      <path d="M 0,10 Q -4,8 -6,12" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>
      <path d="M 12,12 Q 22,8 35,12" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.8"/>
    </g>

    <!-- Foreground Deep Pacific Trench Waters -->
    <path d="M 0,82 Q 35,74 70,84 T ${w},80 L ${w},${h} L 0,${h} Z" fill="#2C4A5A"/>
    <line x1="4" y1="${h - 10}" x2="${w - 4}" y2="${h - 10}" stroke="#9BB3BF" stroke-width="0.8" stroke-dasharray="6,4"/>
  `;
}

// ============================================================================
// SVG BUILDER: 24-STORY, 7-REGION BROADSHEET FRONT PAGE
// ============================================================================
function buildSVG(data: NewsData): string {
  // Map dimensions (local coordinates inside group)
  const mapLeft = 0;
  const mapTop = 0;
  const mapWidth = 402;
  const mapHeight = 176;

  const { pathData, project } = generateWorldMapPath(mapLeft, mapTop, mapWidth, mapHeight);

  // Accurate Map Pins 1–9 with calibrated offsets to prevent badge collisions
  const pins = [
    { id: 1, name: 'Antalya', lat: 36.9, lon: 30.7, color: C.regGlobal, dx: 0, dy: 4 },
    { id: 2, name: 'Gulf/Riyadh', lat: 24.7, lon: 46.7, color: C.regMidEast, dx: 0, dy: 0 },
    { id: 3, name: 'Kyiv', lat: 50.4, lon: 30.5, color: C.regEurope, dx: 0, dy: -4 },
    { id: 4, name: 'Portimão', lat: 37.2, lon: -8.6, color: C.regEurope, dx: 0, dy: 0 },
    { id: 5, name: 'Las Vegas', lat: 36.2, lon: -115.1, color: C.regAmericas, dx: -4, dy: 0 },
    { id: 6, name: 'Washington DC', lat: 38.9, lon: -77.0, color: C.regAmericas, dx: 0, dy: 0 },
    { id: 7, name: 'Seoul', lat: 37.6, lon: 127.0, color: C.regAsia, dx: 0, dy: 0 },
    { id: 8, name: 'Nigeria', lat: 9.1, lon: 7.4, color: C.regAfrica, dx: 0, dy: 0 },
    { id: 9, name: 'Canberra', lat: -35.3, lon: 149.1, color: C.regOceania, dx: 0, dy: 0 },
  ];

  const totalWidth = 992; // x: 16 to 1008

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <!-- Paper Grain Texture -->
    <filter id="paper-texture" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="3" seed="20261122" result="noise"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.96  0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0.05 0" result="coloredNoise"/>
      <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="textured"/>
      <feBlend mode="multiply" in="SourceGraphic" in2="textured"/>
    </filter>

    <style>
      .masthead-kicker {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 8.5px;
        font-weight: 800;
        fill: ${C.mutedSlate};
        letter-spacing: 1.5px;
        text-transform: uppercase;
      }
      .masthead-title {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 46px;
        font-weight: 900;
        fill: ${C.inkNavy};
        letter-spacing: 0.5px;
      }
      .masthead-sub {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 10px;
        font-weight: 700;
        fill: ${C.charcoal};
        letter-spacing: 0.8px;
      }
      .sec-title {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 10.5px;
        font-weight: 900;
        fill: ${C.inkNavy};
        letter-spacing: 0.8px;
        text-transform: uppercase;
      }
      .sec-sub {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 7.5px;
        font-weight: 600;
        fill: ${C.mutedSlate};
        letter-spacing: 0.5px;
      }
      .hero-title {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 15.5px;
        font-weight: 900;
        fill: ${C.inkNavy};
        letter-spacing: -0.2px;
      }
      .hero-body {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 9.2px;
        font-weight: 500;
        fill: ${C.charcoal};
      }
      .grid-title {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 10.6px;
        font-weight: 900;
        fill: ${C.inkNavy};
        letter-spacing: -0.2px;
      }
      .grid-body {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 8.2px;
        font-weight: 500;
        fill: ${C.charcoal};
      }
      .src-line {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 7.5px;
        font-weight: 700;
        fill: ${C.mutedSlate};
        letter-spacing: 0.6px;
        text-transform: uppercase;
      }
      .bottom-col-text {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 8px;
        fill: ${C.inkNavy};
      }
    </style>
  </defs>

  <!-- Canvas Background -->
  <rect width="1024" height="1024" fill="${C.paper}"/>

  <!-- ====================================================================== -->
  <!-- ZONE 1: MASTHEAD (y: 12 to 78)                                         -->
  <!-- ====================================================================== -->
  <g id="zone-1-masthead">
    <text x="16" y="24" class="masthead-kicker">GLOBAL BROADSHEET • 24-HOUR DAILY RECORD • VERIFIED DISPATCHES</text>
    <text x="16" y="58" class="masthead-title">WORLD NEWS</text>
    <text x="18" y="74" class="masthead-sub">${esc(data.subtitle)}</text>

    <!-- Crimson Date Badge -->
    <g transform="translate(720, 16)">
      <rect width="288" height="56" rx="5" fill="${C.crimson}"/>
      <rect x="3" y="3" width="282" height="50" rx="3.5" fill="none" stroke="#FFFFFF" stroke-width="1" stroke-opacity="0.3"/>
      <text x="144" y="21" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.5" font-weight="800" fill="${C.crimsonLight}" letter-spacing="1.5">GLOBAL EDITION • FULL-DAY RECORD</text>
      <text x="144" y="44" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="16" font-weight="900" fill="#FFFFFF" letter-spacing="0.8">${esc(data.displayDate)}</text>
    </g>

    <!-- Separator Line -->
    <line x1="16" y1="80" x2="1008" y2="80" stroke="${C.dividerHeavy}" stroke-width="2"/>
  </g>

  <!-- ====================================================================== -->
  <!-- ZONE 2: KEY NUMBERS STRIP (y: 84 to 124, 6 Equal Boxes)                -->
  <!-- ====================================================================== -->
  <g id="zone-2-numbers">
    ${data.keyNumbers.map((num, i) => {
      const bx = 16 + i * 167;
      const bw = 158;
      const words = num.label.split(' ');
      const mid = Math.ceil(words.length / 2);
      const l1 = words.slice(0, mid).join(' ');
      const l2 = words.slice(mid).join(' ');
      const numFontSize = num.value === 'NO DEAL' ? 12.5 : num.value.length >= 7 ? 13 : num.value.length >= 5 ? 15.5 : num.value.length >= 4 ? 16.5 : 17.5;
      const labelX = num.value === 'NO DEAL' ? 70 : num.value.length >= 7 ? 68 : num.value.length >= 5 ? 65 : num.value.length >= 4 ? 58 : num.value.length === 3 ? 46 : 36;
      const isRed = i === 0 || i === 3 || i === 4;
      return `
        <g transform="translate(${bx}, 84)">
          <rect width="${bw}" height="40" rx="3.5" fill="${C.cardMuted}" stroke="${C.cardBorder}" stroke-width="1"/>
          <text x="8" y="26" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="${numFontSize}" font-weight="900" fill="${isRed ? C.crimson : C.inkNavy}">${esc(num.value)}</text>
          <text x="${labelX}" y="16" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="600" fill="${C.charcoal}">${esc(l1)}</text>
          <text x="${labelX}" y="27" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="600" fill="${C.charcoal}">${esc(l2)}</text>
        </g>
      `;
    }).join('')}
  </g>

  <!-- ====================================================================== -->
  <!-- ZONE 3: 7-REGION COVERAGE BAR (y: 128 to 148, Stacked Ratio Bar)       -->
  <!-- ====================================================================== -->
  <g id="zone-3-coverage" transform="translate(16, 128)">
    <rect width="${totalWidth}" height="20" rx="3" fill="${C.cardMuted}" stroke="${C.cardBorder}" stroke-width="1"/>
    ${(() => {
      let currentX = 0;
      const totalStories = 24;
      return data.regionDistribution.map(r => {
        const segWidth = (r.count / totalStories) * totalWidth;
        const segText = segWidth < 50 ? `${r.code} (${r.count})` : `${esc(r.region.toUpperCase())} (${r.count})`;
        const out = `
          <rect x="${currentX}" y="0" width="${segWidth}" height="20" fill="${r.color}" stroke="${C.paper}" stroke-width="0.75"/>
          <text x="${currentX + segWidth / 2}" y="13.5" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.2" font-weight="800" fill="#FFFFFF" letter-spacing="0.6">${segText}</text>
        `;
        currentX += segWidth;
        return out;
      }).join('');
    })()}
  </g>

  <!-- ====================================================================== -->
  <!-- ZONE 4: TOP 3 HERO CARDS (y: 154 to 362, 3 Columns)                    -->
  <!-- ====================================================================== -->
  <g id="zone-4-heroes">
    ${data.topHeroes.map((hero, i) => {
      const colX = 16 + i * 334;
      const colW = 324;
      const colH = 208;
      const illH = 82;

      let illSvg = '';
      if (hero.id === 1) illSvg = renderIllustration1(colW - 16, illH);
      else if (hero.id === 2) illSvg = renderIllustration2(colW - 16, illH);
      else if (hero.id === 3) illSvg = renderIllustration3(colW - 16, illH);

      return `
        <g transform="translate(${colX}, 154)">
          <!-- Card Frame -->
          <rect width="${colW}" height="${colH}" rx="5" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
          
          <!-- Card Header Bar -->
          <rect x="0" y="0" width="${colW}" height="24" rx="5" fill="${C.cardMuted}"/>
          <rect x="0" y="20" width="${colW}" height="4" fill="${C.cardMuted}"/>
          <!-- Region Color Indicator Accent -->
          <rect x="0" y="0" width="5" height="24" rx="2" fill="${hero.regionColor}"/>
          <text x="12" y="16" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="9" font-weight="900" fill="${hero.regionColor}">[${hero.id}] ${esc(hero.region)}</text>
          <!-- Status Badge -->
          <g transform="translate(${colW - 54}, 4.5)">
            ${renderStatusBadge(hero.status, 7)}
          </g>

          <!-- Bespoke Vector Artwork (ZERO floating text) -->
          <g transform="translate(8, 30)">
            ${illSvg}
          </g>

          <!-- Headline & Factual Summary -->
          <text x="8" y="132" class="hero-title">${esc(hero.headline)}</text>
          ${(() => {
            const lines = wrapText(hero.summary, 48);
            return lines.map((line, li) => 
              `<text x="8" y="${150 + li * 15}" class="hero-body">${esc(line)}</text>`
            ).join('');
          })()}
          <text x="8" y="196" class="src-line">SOURCE: ${esc(hero.sources)} • ${esc(hero.location)}</text>
        </g>
      `;
    }).join('')}
  </g>

  <!-- ====================================================================== -->
  <!-- ZONE 5: STORIES 4–9 ILLUSTRATED GRID (y: 368 to 626, 2x3 Cards)        -->
  <!-- ====================================================================== -->
  <g id="zone-5-grid">
    ${data.gridStories.map((story, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const cardX = 16 + col * 334;
      const cardY = 368 + row * 130;
      const cardW = 324;
      const cardH = 124;

      const illW = 90;
      const illH = 108;

      let illSvg = '';
      if (story.id === 4) illSvg = renderIllustration4(illW, illH);
      else if (story.id === 5) illSvg = renderIllustration5(illW, illH);
      else if (story.id === 6) illSvg = renderIllustration6(illW, illH);
      else if (story.id === 7) illSvg = renderIllustration7(illW, illH);
      else if (story.id === 8) illSvg = renderIllustration8(illW, illH);
      else if (story.id === 9) illSvg = renderIllustration9(illW, illH);

      return `
        <g transform="translate(${cardX}, ${cardY})">
          <!-- Card Frame -->
          <rect width="${cardW}" height="${cardH}" rx="5" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
          
          <!-- Left Artwork (ZERO floating text) -->
          <g transform="translate(8, 8)">
            ${illSvg}
          </g>

          <!-- Right Content Area -->
          <g transform="translate(102, 12)">
            <!-- Header Tag & Badge -->
            <rect x="0" y="0" width="3" height="14" rx="1.5" fill="${story.regionColor}"/>
            <text x="8" y="11" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.5" font-weight="900" fill="${story.regionColor}">[${story.id}] ${esc(story.region)}</text>
            <g transform="translate(${cardW - 158}, 0)">
              ${renderStatusBadge(story.status, 6.5)}
            </g>

            <!-- Headline -->
            <text x="0" y="32" class="grid-title">${esc(story.headline)}</text>
            
            <!-- Summary Lines (Word Wrapped) -->
            ${(() => {
              const lines = wrapText(story.summary, 36);
              return lines.map((line, li) => 
                `<text x="0" y="${47 + li * 13}" class="grid-body">${esc(line)}</text>`
              ).join('');
            })()}

            <!-- Source Line -->
            <text x="0" y="98" class="src-line">SOURCE: ${esc(story.sources)}</text>
          </g>
        </g>
      `;
    }).join('')}
  </g>

  <!-- ====================================================================== -->
  <!-- ZONE 6: BOTTOM SPLIT (y: 632 to 946)                                   -->
  <!-- ====================================================================== -->
  <g id="zone-6-bottom-split">
    <!-- LEFT: Genuine Natural Earth 110m World Map -->
    <g id="map-container" transform="translate(16, 632)">
      <rect width="418" height="314" rx="5" fill="${C.cardMuted}" stroke="${C.cardBorder}" stroke-width="1"/>
      
      <!-- Map Header -->
      <text x="12" y="18" class="sec-title">WHERE IT HAPPENED (1–9)</text>
      <text x="${418 - 12}" y="18" text-anchor="end" class="sec-sub">NATURAL EARTH 110M PROJECTION</text>
      <line x1="12" y1="24" x2="${418 - 12}" y2="24" stroke="${C.divider}" stroke-width="1"/>

      <!-- Map Viewport -->
      <g transform="translate(8, 28)">
        <!-- Ocean Canvas -->
        <rect width="${mapWidth}" height="${mapHeight}" rx="3" fill="${C.ocean}" stroke="${C.landStroke}" stroke-width="1"/>
        
        <!-- Lat / Lon Graticule Lines -->
        <line x1="0" y1="${mapHeight * 0.58}" x2="${mapWidth}" y2="${mapHeight * 0.58}" stroke="#CAD8E0" stroke-width="0.8" stroke-dasharray="3,3"/>
        <line x1="${mapWidth * 0.5}" y1="0" x2="${mapWidth * 0.5}" y2="${mapHeight}" stroke="#CAD8E0" stroke-width="0.8" stroke-dasharray="3,3"/>

        <!-- Natural Earth 110m Land Polygons -->
        <path d="${pathData}" fill="${C.land}" stroke="${C.landStroke}" stroke-width="0.6"/>

        <!-- Numbered Pins 1–9 with Leader Lines -->
        ${pins.map(pin => {
          const [px, py] = project(pin.lon, pin.lat);
          const pinX = px + pin.dx;
          const pinY = py + pin.dy;

          let leader = '';
          if (pin.dx !== 0 || pin.dy !== 0) {
            leader = `<line x1="${px}" y1="${py}" x2="${pinX}" y2="${pinY}" stroke="${pin.color}" stroke-width="1"/>`;
          }

          return `
            ${leader}
            <!-- Real Coordinate Point -->
            <circle cx="${px}" cy="${py}" r="1.8" fill="${C.inkNavy}"/>
            <!-- Pin Badge -->
            <circle cx="${pinX}" cy="${pinY}" r="5.5" fill="${pin.color}" stroke="#FFFFFF" stroke-width="1.2"/>
            <text x="${pinX}" y="${pinY + 2.5}" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="900" fill="#FFFFFF">${pin.id}</text>
          `;
        }).join('')}
      </g>

      <!-- 3x3 Compact Pin Key Below Map (y: 212 to 306) -->
      <g transform="translate(12, 212)">
        <line x1="0" y1="0" x2="${418 - 24}" y2="0" stroke="${C.divider}" stroke-width="1"/>
        
        <!-- Row 1 -->
        <g transform="translate(0, 14)">
          <circle cx="5" cy="-2.5" r="4.5" fill="${C.regGlobal}"/>
          <text x="5" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">1</text>
          <text x="13" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Antalya: COP31 Collapse</text>

          <circle cx="134" cy="-2.5" r="4.5" fill="${C.regMidEast}"/>
          <text x="134" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">2</text>
          <text x="142" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Gulf: Missile Defense</text>

          <circle cx="268" cy="-2.5" r="4.5" fill="${C.regEurope}"/>
          <text x="268" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">3</text>
          <text x="276" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Kyiv: Strike &amp; Ship Fire</text>
        </g>

        <!-- Row 2 -->
        <g transform="translate(0, 42)">
          <circle cx="5" cy="-2.5" r="4.5" fill="${C.regEurope}"/>
          <text x="5" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">4</text>
          <text x="13" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Portimão: Márquez 8th</text>

          <circle cx="134" cy="-2.5" r="4.5" fill="${C.regAmericas}"/>
          <text x="134" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">5</text>
          <text x="142" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Las Vegas: F1 Victory</text>

          <circle cx="268" cy="-2.5" r="4.5" fill="${C.regAmericas}"/>
          <text x="268" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">6</text>
          <text x="276" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Washington: Tech Curb</text>
        </g>

        <!-- Row 3 -->
        <g transform="translate(0, 70)">
          <circle cx="5" cy="-2.5" r="4.5" fill="${C.regAsia}"/>
          <text x="5" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">7</text>
          <text x="13" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Seoul: Minister to Resign</text>

          <circle cx="134" cy="-2.5" r="4.5" fill="${C.regAfrica}"/>
          <text x="134" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">8</text>
          <text x="142" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Nigeria: Boat Tragedy</text>

          <circle cx="268" cy="-2.5" r="4.5" fill="${C.regOceania}"/>
          <text x="268" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">9</text>
          <text x="276" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Canberra: AUKUS Defense</text>
        </g>
      </g>
    </g>

    <!-- RIGHT: 15 MORE STORIES (10–24) IN 2 COLUMNS -->
    <g id="bottom-stories-container" transform="translate(444, 632)">
      <rect width="564" height="314" rx="5" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
      
      <!-- Header -->
      <text x="14" y="18" class="sec-title">15 MORE STORIES ACROSS 6 REGIONS (10–24)</text>
      <text x="${564 - 14}" y="18" text-anchor="end" class="sec-sub">VERIFIED FULL-DAY 22 NOV 2026 DISPATCHES</text>
      <line x1="14" y1="24" x2="${564 - 14}" y2="24" stroke="${C.divider}" stroke-width="1"/>

      <!-- Vertical Divider between Column 1 and Column 2 -->
      <line x1="282" y1="28" x2="282" y2="306" stroke="${C.divider}" stroke-width="0.8"/>

      <!-- COLUMN 1: Stories 10–17 (8 stories) -->
      <g transform="translate(12, 28)">
        ${data.bottomStories.slice(0, 8).map((s, idx) => {
          const rowY = idx * 34.5;
          return `
            <g transform="translate(0, ${rowY})">
              <!-- Story Number Pill -->
              <rect x="0" y="2" width="20" height="12" rx="2" fill="${s.regionColor}"/>
              <text x="10" y="11" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="900" fill="#FFFFFF">${s.id}</text>
              
              <!-- Region Name -->
              <text x="24" y="11.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7" font-weight="800" fill="${s.regionColor}">${esc(s.region)}</text>
              
              <!-- Status Badge & Source -->
              <g transform="translate(90, 2)">
                ${renderStatusBadge(s.status, 5.5)}
              </g>
              <text x="${90 + (s.status === 'CONFIRMED' ? 44 : s.status === 'REPORTED' ? 40 : 34) + 4}" y="11" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.8" font-weight="700" fill="${C.mutedSlate}">(${esc(s.source)})</text>

              <!-- Main Story Text (2 lines) -->
              <text x="0" y="21" class="bottom-col-text">
                <tspan font-weight="800" fill="${C.inkNavy}">${esc(s.lead)}</tspan>
              </text>
              <text x="0" y="30.5" class="bottom-col-text">
                <tspan font-weight="500" fill="${C.charcoal}">${esc(s.body)}</tspan>
              </text>

              ${idx < 7 ? `<line x1="0" y1="33" x2="258" y2="33" stroke="${C.cardBorderSubtle}" stroke-width="0.6"/>` : ''}
            </g>
          `;
        }).join('')}
      </g>

      <!-- COLUMN 2: Stories 18–24 (7 stories) -->
      <g transform="translate(294, 28)">
        ${data.bottomStories.slice(8).map((s, idx) => {
          const rowY = idx * 39.5;
          return `
            <g transform="translate(0, ${rowY})">
              <!-- Story Number Pill -->
              <rect x="0" y="2" width="20" height="12" rx="2" fill="${s.regionColor}"/>
              <text x="10" y="11" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="900" fill="#FFFFFF">${s.id}</text>
              
              <!-- Region Name -->
              <text x="24" y="11.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7" font-weight="800" fill="${s.regionColor}">${esc(s.region)}</text>
              
              <!-- Status Badge & Source -->
              <g transform="translate(90, 2)">
                ${renderStatusBadge(s.status, 5.5)}
              </g>
              <text x="${90 + (s.status === 'CONFIRMED' ? 44 : s.status === 'REPORTED' ? 40 : 34) + 4}" y="11" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.8" font-weight="700" fill="${C.mutedSlate}">(${esc(s.source)})</text>

              <!-- Main Story Text (2 lines) -->
              <text x="0" y="21" class="bottom-col-text">
                <tspan font-weight="800" fill="${C.inkNavy}">${esc(s.lead)}</tspan>
              </text>
              <text x="0" y="31.5" class="bottom-col-text">
                <tspan font-weight="500" fill="${C.charcoal}">${esc(s.body)}</tspan>
              </text>

              ${idx < 6 ? `<line x1="0" y1="37" x2="258" y2="37" stroke="${C.cardBorderSubtle}" stroke-width="0.6"/>` : ''}
            </g>
          `;
        }).join('')}
      </g>
    </g>
  </g>

  <!-- ====================================================================== -->
  <!-- ZONE 7: FOOTER VERIFICATION STRIP (y: 952 to 1012, 2 Equal Boxes)      -->
  <!-- ====================================================================== -->
  <g id="zone-7-footer" transform="translate(16, 952)">
    <!-- Box 1: HOW WE CHECKED -->
    <g transform="translate(0, 0)">
      <rect width="490" height="58" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorder}" stroke-width="1"/>
      <text x="12" y="16" class="sec-title" font-size="9">HOW WE CHECKED · VERIFICATION TIERS</text>
      
      <!-- 3 Tier Badges -->
      <g transform="translate(12, 24)">
        <!-- Confirmed -->
        <rect x="0" y="0" width="62" height="15" rx="2.5" fill="#1B4332"/>
        <text x="31" y="10.5" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="800" fill="#FFFFFF">CONFIRMED</text>
        <text x="68" y="11" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="600" fill="${C.charcoal}">Multi-outlet wire + local corroboration</text>

        <!-- Official -->
        <rect x="0" y="18" width="62" height="15" rx="2.5" fill="${C.crimson}"/>
        <text x="31" y="28.5" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="800" fill="#FFFFFF">OFFICIAL</text>
        <text x="68" y="29" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="600" fill="${C.charcoal}">Government ministry, armed forces or agency</text>
      </g>
      <g transform="translate(265, 24)">
        <!-- Reported -->
        <rect x="0" y="0" width="58" height="15" rx="2.5" fill="#334155"/>
        <text x="29" y="10.5" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="800" fill="#FFFFFF">REPORTED</text>
        <text x="64" y="11" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="600" fill="${C.charcoal}">Single credible major news desk</text>
      </g>
    </g>

    <!-- Box 2: DATE CHECK -->
    <g transform="translate(502, 0)">
      <rect width="490" height="58" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorder}" stroke-width="1"/>
      <text x="12" y="16" class="sec-title" font-size="9" fill="${C.crimson}">DATE CHECK · FULL-DAY 22 NOVEMBER 2026 UTC</text>
      
      <g transform="translate(12, 26)">
        <text x="0" y="10" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.5" font-weight="700" fill="${C.inkNavy}">• All 24 events occurred or were first reported on 22 November 2026.</text>
        <text x="0" y="22" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="500" fill="${C.charcoal}">• Prior-day Nov 20–21 spillover (Mexico cartel arrest firefight, Brazil storm) strictly excluded.</text>
      </g>
    </g>
  </g>
</svg>`;
}

export async function renderEditorialImage(): Promise<{ width: number; height: number; sizeBytes: number; path: string }> {
  const data = loadStories();
  const svgContent = buildSVG(data);

  // Ensure assets directory exists
  const assetsDir = resolve(rootDir, 'assets');
  mkdirSync(assetsDir, { recursive: true });

  // 1. Render SVG layout at 2048x2048 using Resvg for pure vector fidelity
  const resvg = new Resvg(svgContent, {
    fitTo: {
      mode: 'width',
      value: 2048,
    },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'Georgia',
    },
  });

  const png2048Buffer = resvg.render().asPng();

  // 2. Downsample crisply to EXACTLY 1024x1024 PNG with Lanczos3 anti-aliasing
  // Using compressionLevel: 8 to land inside the 300-520 KB target
  const finalPngBuffer = await sharp(png2048Buffer)
    .resize(1024, 1024, {
      kernel: 'lanczos3',
      fit: 'fill',
    })
    .png({
      compressionLevel: 8,
      adaptiveFiltering: true,
      palette: false,
    })
    .toBuffer();

  const outputPath = resolve(assetsDir, 'entry.png');
  writeFileSync(outputPath, finalPngBuffer);

  return {
    width: 1024,
    height: 1024,
    sizeBytes: finalPngBuffer.length,
    path: outputPath,
  };
}

// Direct execution support
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  renderEditorialImage()
    .then(res => {
      console.log(`Rendered editorial entry successfully:`);
      console.log(`  Path: ${res.path}`);
      console.log(`  Dimensions: ${res.width}x${res.height}`);
      console.log(`  File size: ${res.sizeBytes} bytes (${(res.sizeBytes / 1024).toFixed(1)} KB)`);
    })
    .catch(err => {
      console.error('Rendering error:', err);
      process.exit(1);
    });
}
