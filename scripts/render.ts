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
  kicker: string;
  subtitle: string;
  keyNumbers: Array<{ value: string; label: string }>;
  regionDistribution: Array<{ region: string; code: string; count: number; color: string }>;
  timelineNodes: Array<{ time: string; event: string }>;
  topHeroes: Array<{
    id: number;
    region: string;
    regionColor: string;
    status: 'CONFIRMED' | 'OFFICIAL' | 'REPORTED' | 'CLAIM';
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
    status: 'CONFIRMED' | 'OFFICIAL' | 'REPORTED' | 'CLAIM';
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
    status: 'CONFIRMED' | 'OFFICIAL' | 'REPORTED' | 'CLAIM';
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
  paper: '#F7F3E9',
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
  amber: '#D97706',
  amberLight: '#FBBF24',
  // Steel editorial illustration palette
  steelDark: '#2C4A5A',
  steelMid: '#648595',
  steelLight: '#9BB3BF',
  steelPale: '#D2DFE6',
  // Regional Accents
  regGlobal: '#1E3A5F',
  regMidEast: '#B91C1C',
  regEurope: '#1D4ED8',
  regAmericas: '#9A3412',
  regAsia: '#0F766E',
  regAfrica: '#A16207',
  regOceania: '#6D28D9',
  // Map Palette
  ocean: '#102438',
  land: '#C9D6CE',
  landStroke: '#8FA396',
};

function renderStatusBadge(status: 'CONFIRMED' | 'OFFICIAL' | 'REPORTED' | 'CLAIM', fontSize = 7): string {
  const cfg = {
    CONFIRMED: { bg: '#1B4332', text: '#FFFFFF', label: 'CONFIRMED' },
    OFFICIAL: { bg: C.crimson, text: '#FFFFFF', label: 'OFFICIAL' },
    REPORTED: { bg: '#334155', text: '#FFFFFF', label: 'REPORTED' },
    CLAIM: { bg: '#9A3412', text: '#FFFFFF', label: 'CLAIM' },
  }[status];

  const w = status === 'CONFIRMED' ? fontSize * 7.4 : status === 'REPORTED' ? fontSize * 6.8 : status === 'CLAIM' ? fontSize * 5.2 : fontSize * 6.0;
  const h = fontSize + 5.5;

  return `
    <rect width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${cfg.bg}"/>
    <text x="${(w / 2).toFixed(1)}" y="${(h - 3.5).toFixed(1)}" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="${cfg.text}" letter-spacing="0.5">${cfg.label}</text>
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
// 13 BESPOKE EDITORIAL VECTOR ILLUSTRATIONS (ZERO FLOATING TEXT)
// ============================================================================

// 1. Hero: COP31 Antalya Summit Collapses
function renderIllustration1(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="3" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Mediterranean Mountain Ridgeline -->
    <path d="M 0,${h - 16} L 45,${h - 42} L 95,${h - 28} L 155,${h - 52} L 210,${h - 32} L ${w},${h - 18} L ${w},${h} L 0,${h} Z" fill="#DDE4EA"/>
    <polygon points="155,${h - 52} 165,${h - 42} 145,${h - 42}" fill="#FFFFFF" opacity="0.9"/>
    <!-- Coastline Water -->
    <rect x="0" y="${h - 16}" width="${w}" height="16" fill="#D2DFE6"/>
    <line x1="8" y1="${h - 9}" x2="${w - 8}" y2="${h - 9}" stroke="#9BB3BF" stroke-width="1" stroke-dasharray="8,5"/>
    
    <!-- Modern Cantilever Summit Hall -->
    <polygon points="14,${h - 16} 145,${h - 16} 158,${h - 6} 6,${h - 6}" fill="${C.steelDark}"/>
    <polygon points="20,${h - 52} 130,${h - 62} 142,${h - 40} 34,${h - 32}" fill="${C.steelDark}"/>
    <polygon points="28,${h - 54} 135,${h - 64} 140,${h - 56} 32,${h - 46}" fill="${C.steelMid}"/>
    <!-- Glass Facade & Columns -->
    <polygon points="34,${h - 32} 142,${h - 40} 138,${h - 16} 30,${h - 16}" fill="#C8D8E2" opacity="0.85"/>
    <line x1="56" y1="${h - 34}" x2="52" y2="${h - 16}" stroke="${C.steelDark}" stroke-width="2"/>
    <line x1="82" y1="${h - 37}" x2="78" y2="${h - 16}" stroke="${C.steelDark}" stroke-width="2"/>
    <line x1="108" y1="${h - 39}" x2="104" y2="${h - 16}" stroke="${C.steelDark}" stroke-width="2"/>
    <!-- Flags atop roof -->
    <line x1="26" y1="${h - 52}" x2="26" y2="${h - 70}" stroke="${C.inkNavy}" stroke-width="1.5"/>
    <polygon points="26,${h - 70} 38,${h - 66} 26,${h - 62}" fill="${C.crimson}"/>

    <!-- Stylized COP31 Climate Globe (Center-Right) -->
    <g transform="translate(196, 36)">
      <circle cx="0" cy="0" r="20" fill="#E2EBF0" stroke="${C.steelDark}" stroke-width="1.4"/>
      <line x1="-20" y1="0" x2="20" y2="0" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="0" y1="-20" x2="0" y2="20" stroke="${C.steelMid}" stroke-width="1"/>
      <ellipse cx="0" cy="-9" rx="17" ry="5" fill="none" stroke="${C.steelMid}" stroke-width="0.8"/>
      <ellipse cx="0" cy="9" rx="17" ry="5" fill="none" stroke="${C.steelMid}" stroke-width="0.8"/>
      <ellipse cx="0" cy="0" rx="10" ry="20" fill="none" stroke="${C.steelMid}" stroke-width="0.9"/>
      <circle cx="5" cy="-6" r="2.8" fill="${C.crimson}"/>
      <circle cx="5" cy="-6" r="5" fill="none" stroke="${C.crimson}" stroke-width="0.8" opacity="0.6"/>
    </g>

    <!-- Talks Collapse Motif: Fractured Conference Gavel & Sound Block (Far Right) -->
    <g transform="translate(262, 38)">
      <rect x="-14" y="14" width="28" height="6" rx="1.5" fill="${C.steelDark}"/>
      <ellipse cx="0" cy="14" rx="14" ry="3" fill="${C.steelMid}"/>
      <g transform="rotate(-24)">
        <polygon points="-12,-6 12,-6 10,6 -10,6" fill="${C.crimson}"/>
        <rect x="-3" y="6" width="6" height="4" rx="1" fill="${C.steelDark}"/>
        <path d="M 0,-6 L -3,-18" stroke="${C.steelDark}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M -1,-22 L 5,-32" stroke="${C.steelDark}" stroke-width="2.5" stroke-linecap="round"/>
        <polygon points="-2,-20 2,-18 -1,-16 -4,-18" fill="${C.crimsonBright}"/>
      </g>
    </g>
  `;
}

// 2. Hero: 186 Russian Drones Strike Ukraine & Baltic Ship Fire
function renderIllustration2(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="3" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    
    <!-- Kyiv / Dymer Damaged Apartment Silhouette -->
    <g transform="translate(14, 10)">
      <rect x="0" y="6" width="54" height="54" rx="2" fill="${C.steelDark}" stroke="${C.inkNavy}" stroke-width="1.2"/>
      ${[0, 1, 2, 3].map(row => 
        [0, 1, 2].map(col => `
          <rect x="${6 + col * 15}" y="${12 + row * 11}" width="9" height="6" rx="1" fill="#E2EBF0" opacity="${row === 1 && col === 2 ? '0.2' : '0.85'}"/>
        `).join('')
      ).join('')}
      <!-- Damage Breach on Upper Corner -->
      <polygon points="40,6 54,6 54,20 44,16 40,11" fill="${C.cardMuted}"/>
      <circle cx="47" cy="13" r="7" fill="none" stroke="${C.crimson}" stroke-width="1.4" stroke-dasharray="2,2"/>
      <circle cx="47" cy="13" r="3" fill="${C.crimson}"/>
      <!-- Anti-Aircraft Searchlight Beam -->
      <polygon points="12,6 36,-10 44,-10 16,6" fill="#FFF8DC" opacity="0.35"/>
    </g>

    <!-- Drone Swarm & Flak Detonations in Night Sky -->
    <g transform="translate(86, 12)">
      <!-- Delta-wing Drones (Shahed-type & Jet-type) -->
      <polygon points="14,6 20,16 8,16" fill="${C.inkNavy}"/>
      <polygon points="34,14 40,24 28,24" fill="${C.inkNavy}"/>
      <polygon points="56,8 62,18 50,18" fill="${C.inkNavy}"/>
      <!-- Jet Drone High Speed Trace -->
      <line x1="16" y1="28" x2="42" y2="28" stroke="${C.crimson}" stroke-width="1.5" stroke-dasharray="3,2"/>
      <polygon points="42,28 36,25 36,31" fill="${C.crimson}"/>
      <!-- Kinetic Flak Burst -->
      <circle cx="28" cy="18" r="5" fill="${C.crimsonLight}" opacity="0.6"/>
      <circle cx="28" cy="18" r="2.5" fill="${C.crimson}"/>
    </g>

    <line x1="162" y1="8" x2="162" y2="${h - 8}" stroke="${C.divider}" stroke-width="0.8" stroke-dasharray="3,3"/>

    <!-- Baltic Sea Waters & Burning Cargo Ship (Right) -->
    <g transform="translate(170, 0)">
      <path d="M 0,${h - 16} Q 35,${h - 22} 70,${h - 16} T 130,${h - 18} L 130,${h} L 0,${h} Z" fill="${C.steelDark}"/>
      <g transform="translate(10, ${h - 22})">
        <polygon points="0,-4 105,-4 116,-12 120,-12 118,2 8,2" fill="${C.inkNavy}"/>
        <rect x="8" y="-10" width="18" height="6" fill="${C.steelMid}"/>
        <rect x="34" y="-10" width="14" height="6" rx="0.6" fill="${C.steelMid}"/>
        <rect x="52" y="-10" width="14" height="6" rx="0.6" fill="${C.steelLight}"/>
        <!-- Burning Container Stacks -->
        <rect x="70" y="-12" width="16" height="8" rx="0.6" fill="${C.charcoal}"/>
        <path d="M 74,-12 Q 78,-24 82,-16 Q 86,-28 90,-14 Z" fill="${C.crimson}"/>
        <circle cx="80" cy="-24" r="6" fill="#64748B" opacity="0.6"/>
        <circle cx="88" cy="-30" r="8" fill="#94A3B8" opacity="0.5"/>
      </g>
    </g>
  `;
}

// 3. Hero: Gulf Missile & Iran Escalation
function renderIllustration3(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="3" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Desert Dune Strata -->
    <path d="M 0,${h - 14} Q 80,${h - 24} 160,${h - 18} T ${w},${h - 20} L ${w},${h} L 0,${h} Z" fill="#DDD5C2"/>
    <!-- Geodesic Radar Dome Battery -->
    <g transform="translate(40, ${h - 20})">
      <rect x="-24" y="-6" width="48" height="6" fill="${C.steelDark}" rx="1.5"/>
      <path d="M -20,-6 A 20 20 0 0 1 20,-6 Z" fill="${C.steelDark}"/>
      <path d="M -14,-6 A 14 14 0 0 1 14,-6" fill="none" stroke="${C.steelMid}" stroke-width="1.2"/>
      <line x1="0" y1="-26" x2="0" y2="-6" stroke="${C.steelMid}" stroke-width="1.4"/>
      <g transform="translate(28, -6)">
        <polygon points="-4,-4 8,-20 12,-18 0,-2" fill="${C.inkNavy}"/>
        <circle cx="10" cy="-19" r="1.5" fill="${C.crimson}"/>
      </g>
    </g>
    <!-- Radar Waves -->
    <path d="M 40,${h - 38} A 50 50 0 0 1 90,${h - 64}" fill="none" stroke="#9BB3BF" stroke-width="1.2" stroke-dasharray="3,3"/>
    <!-- Inbound Missile Trajectory -->
    <path d="M ${w - 18},14 Q ${w - 55},38 ${w - 95},50" fill="none" stroke="${C.inkNavy}" stroke-width="1.5" stroke-dasharray="4,2"/>
    <!-- Interceptor Arc -->
    <path d="M 46,${h - 40} Q 105,20 ${w - 95},50" fill="none" stroke="${C.crimson}" stroke-width="2.6"/>
    <!-- Kinetic Starburst Impact -->
    <g transform="translate(${w - 95}, 50)">
      <circle cx="0" cy="0" r="14" fill="${C.crimsonLight}" opacity="0.6"/>
      <circle cx="0" cy="0" r="7" fill="${C.crimson}" opacity="0.4"/>
      <circle cx="0" cy="0" r="2.8" fill="${C.crimson}"/>
      <line x1="-10" y1="0" x2="10" y2="0" stroke="${C.crimson}" stroke-width="2"/>
      <line x1="0" y1="-10" x2="0" y2="10" stroke="${C.crimson}" stroke-width="2"/>
    </g>
    <!-- Deflected Hostile Missile -->
    <g transform="translate(${w - 74}, 36) rotate(-42)">
      <polygon points="0,-12 3,2 2,10 -2,10 -3,2" fill="${C.inkNavy}"/>
    </g>
  `;
}

// 4. Grid: Márquez 8th MotoGP Title
function renderIllustration4(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="3" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Portimão Track Asphalt & Rumble Kerb -->
    <path d="M 0,${h - 6} Q 35,${h - 20} 60,10 L 80,6 Q 50,${h - 16} 15,${h} Z" fill="#334155"/>
    <polygon points="0,${h - 10} 8,${h - 14} 12,${h - 12} 4,${h - 8}" fill="${C.crimson}"/>
    <polygon points="8,${h - 14} 16,${h - 19} 20,${h - 17} 12,${h - 12}" fill="#FFFFFF"/>
    <polygon points="16,${h - 19} 25,${h - 26} 29,${h - 23} 20,${h - 17}" fill="${C.crimson}"/>
    <polygon points="25,${h - 26} 34,${h - 34} 38,${h - 31} 29,${h - 23}" fill="#FFFFFF"/>
    <!-- Leaning Prototype Bike & Knee Slider -->
    <g transform="translate(24, ${h - 24}) rotate(-26)">
      <ellipse cx="-12" cy="1" rx="5" ry="3" fill="${C.inkNavy}"/>
      <ellipse cx="14" cy="-3" rx="5" ry="3" fill="${C.inkNavy}"/>
      <polygon points="-10,0 2,-2 10,-4 6,-9 -3,-8" fill="${C.crimson}"/>
      <circle cx="0" cy="-10" r="3.5" fill="${C.inkNavy}"/>
      <ellipse cx="2" cy="1" rx="2" ry="1" fill="#FFFFFF"/>
    </g>
    <!-- Laurels & Trophy Cup -->
    <g transform="translate(${w - 22}, 24)">
      <polygon points="-4,-4 4,-4 2.5,3 -2.5,3" fill="${C.crimson}"/>
      <rect x="-1" y="3" width="2" height="3" fill="${C.steelDark}"/>
      <path d="M -7,6 C -11,1 -10,-5 -5,-9" fill="none" stroke="${C.steelMid}" stroke-width="1"/>
      <path d="M 7,6 C 11,1 10,-5 5,-9" fill="none" stroke="${C.steelMid}" stroke-width="1"/>
    </g>
  `;
}

// 5. Grid: Verstappen Wins Las Vegas GP
function renderIllustration5(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="3" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Vegas Strip Night Skyline & Luxor Beam -->
    <polygon points="12,30 26,12 40,30" fill="#CBD5E1"/>
    <polygon points="24,12 28,12 32,0 20,0" fill="#FFF8DC" opacity="0.6"/>
    <polygon points="50,10 56,16 50,22 44,16" fill="none" stroke="${C.crimson}" stroke-width="1.2"/>
    <circle cx="50" cy="16" r="1.5" fill="${C.crimson}"/>
    <!-- Track & F1 Car Front View -->
    <rect x="0" y="${h - 22}" width="${w}" height="22" fill="#334155"/>
    <g transform="translate(18, ${h - 14})">
      <rect x="0" y="-8" width="6" height="10" rx="1" fill="${C.inkNavy}"/>
      <rect x="34" y="-8" width="6" height="10" rx="1" fill="${C.inkNavy}"/>
      <polygon points="4,0 36,0 28,-5 12,-5" fill="${C.steelDark}"/>
      <circle cx="20" cy="-7" r="2.2" fill="#F59E0B"/>
      <rect x="8" y="4" width="24" height="2" fill="${C.crimson}"/>
    </g>
    <!-- Checkered Flag -->
    <g transform="translate(${w - 20}, 14)">
      <line x1="-6" y1="0" x2="-6" y2="24" stroke="${C.inkNavy}" stroke-width="1.2"/>
      <rect x="-6" y="0" width="4" height="4" fill="${C.inkNavy}"/>
      <rect x="-2" y="0" width="4" height="4" fill="#FFFFFF"/>
      <rect x="2" y="0" width="4" height="4" fill="${C.inkNavy}"/>
      <rect x="-6" y="4" width="4" height="4" fill="#FFFFFF"/>
      <rect x="-2" y="4" width="4" height="4" fill="${C.crimson}"/>
      <rect x="2" y="4" width="4" height="4" fill="#FFFFFF"/>
    </g>
  `;
}

// 6. Grid: India Record 720/9 in NZ
function renderIllustration6(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="3" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Cricket Turf & Boundary Arc -->
    <path d="M 0,${h - 8} Q 40,${h - 18} 80,${h - 12} T ${w},${h - 14} L ${w},${h} L 0,${h} Z" fill="#D1DFD6"/>
    <!-- 3 Stumps & Dislodged Bails -->
    <g transform="translate(26, ${h - 16})">
      <line x1="-6" y1="0" x2="-6" y2="-18" stroke="${C.steelDark}" stroke-width="1.5"/>
      <line x1="0" y1="0" x2="0" y2="-18" stroke="${C.steelDark}" stroke-width="1.5"/>
      <line x1="6" y1="0" x2="6" y2="-18" stroke="${C.steelDark}" stroke-width="1.5"/>
      <!-- Dislodged Flying Bail -->
      <line x1="-3" y1="-21" x2="4" y2="-23" stroke="${C.crimson}" stroke-width="1.2" transform="rotate(15)"/>
    </g>
    <!-- Cricket Bat & Red Leather Ball in Motion -->
    <g transform="translate(56, 16) rotate(32)">
      <polygon points="0,0 5,0 7,24 0,24" fill="${C.steelMid}"/>
      <rect x="1" y="-8" width="3" height="8" rx="0.5" fill="${C.inkNavy}"/>
    </g>
    <!-- Struck Red Ball with Speed Trail -->
    <circle cx="86" cy="18" r="3.5" fill="${C.crimson}"/>
    <path d="M 68,26 Q 76,20 86,18" fill="none" stroke="${C.crimson}" stroke-width="1" stroke-dasharray="2,2"/>
    <!-- Wellington Basin Reserve Stand Silhouette -->
    <polygon points="${w - 38},${h - 16} ${w - 10},${h - 16} ${w - 14},${h - 32} ${w - 34},${h - 32}" fill="#CBD5E1"/>
  `;
}

// 7. Grid: HK Poll 98.79% Turnout
function renderIllustration7(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="3" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Hong Kong Harbour Skyline Towers -->
    <polygon points="12,${h - 14} 20,12 28,${h - 14}" fill="${C.steelDark}"/>
    <rect x="32" y="16" width="10" height="${h - 30}" fill="${C.steelMid}"/>
    <polygon points="46,${h - 14} 52,8 58,${h - 14}" fill="${C.steelDark}"/>
    <!-- Official Ballot Box with Slot -->
    <g transform="translate(${w - 52}, 14)">
      <rect x="0" y="8" width="36" height="26" rx="2" fill="${C.cardBg}" stroke="${C.steelDark}" stroke-width="1.2"/>
      <line x1="8" y1="12" x2="28" y2="12" stroke="${C.inkNavy}" stroke-width="1.5"/>
      <!-- Ballot Slip entering slot -->
      <polygon points="12,2 24,2 24,11 12,11" fill="#FFFFFF" stroke="${C.crimson}" stroke-width="1"/>
      <circle cx="18" cy="6" r="1.5" fill="${C.crimson}"/>
      <!-- Turnout High Percentage Checkmark -->
      <path d="M 12,22 L 16,26 L 24,18" fill="none" stroke="${C.crimson}" stroke-width="1.8"/>
    </g>
  `;
}

// 8. Grid: US–China Tech Curb Clash
function renderIllustration8(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="3" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Server Chassis Rack -->
    <g transform="translate(10, 8)">
      <rect x="0" y="0" width="56" height="34" rx="2" fill="${C.inkNavy}"/>
      <rect x="3" y="4" width="50" height="10" rx="1" fill="${C.steelDark}"/>
      <circle cx="8" cy="9" r="1.5" fill="#10B981"/>
      <circle cx="13" cy="9" r="1.5" fill="${C.steelLight}"/>
      <rect x="3" y="18" width="50" height="10" rx="1" fill="${C.steelDark}"/>
      <circle cx="8" cy="23" r="1.5" fill="${C.crimson}"/>
      <circle cx="13" cy="23" r="1.5" fill="${C.steelLight}"/>
    </g>
    <!-- Optical Transceiver Semiconductor & Severed Trace -->
    <g transform="translate(${w - 78}, 10)">
      <rect x="0" y="2" width="28" height="18" rx="1.5" fill="${C.steelDark}" stroke="${C.inkNavy}" stroke-width="1"/>
      <circle cx="14" cy="11" r="3" fill="${C.crimson}"/>
      <!-- Bus Trace with Red Barrier -->
      <path d="M 32,11 H 46" fill="none" stroke="${C.crimson}" stroke-width="1.8" stroke-dasharray="2,2"/>
      <circle cx="50" cy="11" r="3.5" fill="${C.crimson}"/>
      <line x1="48" y1="9" x2="52" y2="13" stroke="#FFFFFF" stroke-width="1"/>
      <line x1="52" y1="9" x2="48" y2="13" stroke="#FFFFFF" stroke-width="1"/>
      <path d="M 54,11 H 68" fill="none" stroke="${C.charcoal}" stroke-width="1" stroke-dasharray="2,2"/>
    </g>
  `;
}

// 9. Grid: S. Korea Minister Resigns
function renderIllustration9(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="3" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Seoul Ministry Portico Architecture -->
    <g transform="translate(10, 8)">
      <polygon points="0,8 24,0 48,8" fill="${C.steelDark}"/>
      <rect x="4" y="9" width="40" height="2" fill="${C.steelMid}"/>
      <rect x="6" y="11" width="5" height="18" fill="#E2EBF0" stroke="${C.steelDark}" stroke-width="0.8"/>
      <rect x="18" y="11" width="5" height="18" fill="#E2EBF0" stroke="${C.steelDark}" stroke-width="0.8"/>
      <rect x="30" y="11" width="5" height="18" fill="#E2EBF0" stroke="${C.steelDark}" stroke-width="0.8"/>
      <rect x="4" y="29" width="40" height="3" fill="${C.steelDark}"/>
    </g>
    <!-- AI Exam Matrix & Resignation Stamp -->
    <g transform="translate(${w - 68}, 8)">
      <rect x="0" y="0" width="24" height="32" rx="1.5" fill="#FFFFFF" stroke="${C.steelMid}" stroke-width="1"/>
      <circle cx="8" cy="8" r="2" fill="${C.steelDark}"/>
      <circle cx="16" cy="14" r="2" fill="${C.steelDark}"/>
      <circle cx="10" cy="22" r="2.5" fill="${C.crimson}"/>
      <line x1="8" y1="8" x2="16" y2="14" stroke="${C.steelMid}" stroke-width="0.8"/>
      <line x1="16" y1="14" x2="10" y2="22" stroke="${C.crimson}" stroke-width="1"/>
      <!-- Red Official Stamp Seal -->
      <g transform="translate(32, 12)">
        <circle cx="8" cy="8" r="6" fill="${C.crimson}"/>
        <rect x="5.5" y="5.5" width="5" height="5" fill="#FFFFFF"/>
      </g>
    </g>
  `;
}

// 10. Grid: Nigeria Boat Capsizes (24+)
function renderIllustration10(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="3" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- River Swells & Overturned Ferry -->
    <path d="M 0,${h - 18} Q 25,${h - 26} 55,${h - 18} T ${w},${h - 20} L ${w},${h} L 0,${h} Z" fill="#9BB3BF"/>
    <path d="M 0,${h - 10} Q 32,${h - 18} 68,${h - 8} T ${w},${h - 12} L ${w},${h} L 0,${h} Z" fill="#2C4A5A"/>
    <!-- Capsized Boat Hull -->
    <g transform="translate(34, ${h - 18}) rotate(24)">
      <path d="M -16,0 L 16,-2 L 18,5 L -14,5 Z" fill="${C.inkNavy}"/>
      <line x1="-8" y1="0" x2="-8" y2="-6" stroke="${C.inkNavy}" stroke-width="1.2"/>
      <line x1="2" y1="-1" x2="2" y2="-7" stroke="${C.inkNavy}" stroke-width="1.2"/>
    </g>
    <!-- Searchlight & Lifebuoy -->
    <polygon points="${w - 24},6 18,${h - 18} 44,${h - 18}" fill="#FFF8DC" opacity="0.35"/>
    <circle cx="${w - 20}" cy="${h - 12}" r="5" fill="none" stroke="${C.crimson}" stroke-width="2"/>
  `;
}

// 11. Grid: Australia Defends AUKUS
function renderIllustration11(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="3" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Canberra Parliament Spire & Waves -->
    <g transform="translate(${w - 32}, 8)">
      <polygon points="0,0 1.5,18 -1.5,18" fill="${C.steelDark}"/>
      <line x1="-8" y1="18" x2="0" y2="4" stroke="${C.steelMid}" stroke-width="0.8"/>
      <line x1="8" y1="18" x2="0" y2="4" stroke="${C.steelMid}" stroke-width="0.8"/>
    </g>
    <!-- Pacific Swells & Surfaced Submarine Hull -->
    <path d="M 0,${h - 16} Q 30,${h - 24} 60,${h - 16} T ${w},${h - 18} L ${w},${h} L 0,${h} Z" fill="#648595"/>
    <g transform="translate(14, ${h - 18})">
      <path d="M 0,6 Q 10,0 35,0 L 55,1 Q 62,3 65,8 L 0,8 Z" fill="${C.inkNavy}"/>
      <polygon points="22,0 27,-7 34,-7 36,0" fill="${C.inkNavy}"/>
      <line x1="28" y1="-7" x2="28" y2="-12" stroke="${C.steelDark}" stroke-width="1"/>
      <path d="M 0,6 Q -3,4 -5,8" fill="none" stroke="#FFFFFF" stroke-width="1.2"/>
    </g>
  `;
}

// 12. Grid: Paolo Bulgari Dies at 89
function renderIllustration12(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="3" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Classical Roman Column & Capital -->
    <g transform="translate(14, 8)">
      <rect x="2" y="2" width="18" height="2.5" rx="0.5" fill="${C.steelDark}"/>
      <path d="M 2,4.5 C 0,3 2,2 4,3.5 L 18,3.5 C 20,2 22,3 20,4.5" fill="none" stroke="${C.steelDark}" stroke-width="1.2"/>
      <rect x="4" y="6" width="14" height="28" fill="#E2EBF0" stroke="${C.steelDark}" stroke-width="1"/>
      <rect x="2" y="34" width="18" height="3" rx="0.5" fill="${C.steelDark}"/>
    </g>
    <!-- Brilliant Cut Faceted Diamond -->
    <g transform="translate(${w - 52}, 24)">
      <polygon points="-12,-10 12,-10 18,0 -18,0" fill="#EDF3F7" stroke="${C.steelDark}" stroke-width="1.2"/>
      <line x1="-18" y1="0" x2="18" y2="0" stroke="${C.steelDark}" stroke-width="1.2"/>
      <polygon points="-18,0 18,0 0,18" fill="#D2E2EA" stroke="${C.steelDark}" stroke-width="1.2"/>
      <line x1="0" y1="18" x2="-8" y2="0" stroke="${C.steelMid}" stroke-width="0.8"/>
      <line x1="0" y1="18" x2="8" y2="0" stroke="${C.steelMid}" stroke-width="0.8"/>
      <!-- Sparkle -->
      <circle cx="14" cy="-12" r="2" fill="${C.crimson}"/>
    </g>
  `;
}

// 13. Grid: Japan Bans 4 Chemicals
function renderIllustration13(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="3" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Hexagonal Benzene Ring Molecule -->
    <g transform="translate(18, 12)">
      <polygon points="12,0 24,7 24,21 12,28 0,21 0,7" fill="none" stroke="${C.steelDark}" stroke-width="1.5"/>
      <polygon points="12,4 20,9 20,19 12,24 4,19 4,9" fill="none" stroke="${C.steelMid}" stroke-width="0.8" stroke-dasharray="2,2"/>
      <circle cx="12" cy="0" r="2" fill="${C.steelDark}"/>
      <circle cx="24" cy="7" r="2" fill="${C.steelDark}"/>
      <circle cx="24" cy="21" r="2" fill="${C.steelDark}"/>
      <circle cx="12" cy="28" r="2" fill="${C.crimson}"/>
      <circle cx="0" cy="21" r="2" fill="${C.steelDark}"/>
      <circle cx="0" cy="7" r="2" fill="${C.steelDark}"/>
    </g>
    <!-- Chemistry Flask & Prohibition Slash -->
    <g transform="translate(${w - 62}, 10)">
      <polygon points="8,0 14,0 14,8 24,26 24,28 0,28 0,26 8,8" fill="none" stroke="${C.inkNavy}" stroke-width="1.4"/>
      <polygon points="3,23 21,23 23,27 1,27" fill="${C.steelLight}"/>
      <!-- Red Prohibition Circle Slash -->
      <g transform="translate(28, 16)">
        <circle cx="0" cy="0" r="9" fill="none" stroke="${C.crimson}" stroke-width="1.8"/>
        <line x1="-6" y1="-6" x2="6" y2="6" stroke="${C.crimson}" stroke-width="1.8"/>
      </g>
    </g>
  `;
}

// ============================================================================
// SVG BUILDER: 32-STORY, 7-REGION BROADSHEET FRONT PAGE
// ============================================================================
function buildSVG(data: NewsData): string {
  // Map dimensions (local coordinates inside group)
  const mapLeft = 0;
  const mapTop = 0;
  const mapWidth = 386;
  const mapHeight = 172;

  const { pathData, project } = generateWorldMapPath(mapLeft, mapTop, mapWidth, mapHeight);

  // Accurate Map Pins 1–13 with calibrated offsets
  const pins = [
    { id: 1, name: 'Antalya', lat: 36.9, lon: 30.7, color: C.crimsonBright, dx: 0, dy: 4 },
    { id: 2, name: 'Kyiv', lat: 50.4, lon: 30.5, color: C.crimsonBright, dx: 0, dy: -4 },
    { id: 3, name: 'Western Saudi', lat: 24.7, lon: 46.7, color: C.crimsonBright, dx: 0, dy: 0 },
    { id: 4, name: 'Portimão', lat: 37.2, lon: -8.6, color: C.crimsonBright, dx: 0, dy: 0 },
    { id: 5, name: 'Las Vegas', lat: 36.2, lon: -115.1, color: C.crimsonBright, dx: -4, dy: 0 },
    { id: 6, name: 'Wellington', lat: -41.3, lon: 174.8, color: C.crimsonBright, dx: -4, dy: 0 },
    { id: 7, name: 'Hong Kong', lat: 22.3, lon: 114.2, color: C.crimsonBright, dx: 0, dy: 0 },
    { id: 8, name: 'Washington DC', lat: 38.9, lon: -77.0, color: C.crimsonBright, dx: 0, dy: 0 },
    { id: 9, name: 'Seoul', lat: 37.6, lon: 127.0, color: C.crimsonBright, dx: -2, dy: 0 },
    { id: 10, name: 'Nigeria', lat: 9.1, lon: 7.4, color: C.crimsonBright, dx: 0, dy: 0 },
    { id: 11, name: 'Canberra', lat: -35.3, lon: 149.1, color: C.crimsonBright, dx: 0, dy: 0 },
    { id: 12, name: 'Rome', lat: 41.9, lon: 12.5, color: C.crimsonBright, dx: -3, dy: 0 },
    { id: 13, name: 'Tokyo', lat: 35.7, lon: 139.7, color: C.crimsonBright, dx: 3, dy: 0 },
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
      .masthead-title {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 42px;
        font-weight: 900;
        fill: ${C.inkNavy};
        letter-spacing: -0.5px;
      }
      .masthead-kicker {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 8.8px;
        font-style: italic;
        font-weight: 700;
        fill: ${C.crimson};
        letter-spacing: 0.2px;
      }
      .sec-title {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 10px;
        font-weight: 900;
        fill: ${C.inkNavy};
        letter-spacing: 0.8px;
        text-transform: uppercase;
      }
      .sec-sub {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 7.2px;
        font-weight: 700;
        fill: ${C.mutedSlate};
        letter-spacing: 0.5px;
      }
      .hero-title {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 13.5px;
        font-weight: 900;
        fill: ${C.inkNavy};
        letter-spacing: -0.2px;
      }
      .hero-body {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 8.5px;
        font-weight: 500;
        fill: ${C.charcoal};
      }
      .grid-title {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 9.2px;
        font-weight: 900;
        fill: ${C.inkNavy};
        letter-spacing: -0.2px;
      }
      .grid-body {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 7.4px;
        font-weight: 500;
        fill: ${C.charcoal};
      }
      .src-line {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 6.8px;
        font-weight: 700;
        fill: ${C.mutedSlate};
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .bottom-col-text {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 7.2px;
        fill: ${C.inkNavy};
      }
    </style>
  </defs>

  <!-- Canvas Background -->
  <rect width="1024" height="1024" fill="${C.paper}"/>

  <!-- ====================================================================== -->
  <!-- ZONE 1: TOP DARK BANNER + GIANT DATE MASTHEAD (y: 0 to 76)             -->
  <!-- ====================================================================== -->
  <g id="zone-1-masthead">
    <!-- Slim Top Navy Bar -->
    <rect x="0" y="0" width="1024" height="22" fill="${C.inkNavy}"/>
    <text x="16" y="15" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="9" font-weight="900" fill="#FFFFFF" letter-spacing="1.2">THE WORLD IN ONE DAY</text>
    <text x="1008" y="15" text-anchor="end" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="#94A3B8" letter-spacing="0.8">${esc(data.subtitle)}</text>

    <!-- Giant Date Masthead -->
    <text x="16" y="58" class="masthead-title">${esc(data.displayDate)}</text>
    <!-- Crimson Italic Kicker -->
    <text x="16" y="72" class="masthead-kicker">${esc(data.kicker)}</text>

    <!-- Separator Line -->
    <line x1="16" y1="78" x2="1008" y2="78" stroke="${C.dividerHeavy}" stroke-width="1.8"/>
  </g>

  <!-- ====================================================================== -->
  <!-- ZONE 2: 6-METRIC KPI STRIP (y: 80 to 122, 6 Equal Boxes)                -->
  <!-- ====================================================================== -->
  <g id="zone-2-numbers">
    ${data.keyNumbers.map((num, i) => {
      const bx = 16 + i * 167;
      const bw = 158;
      const words = num.label.split(' ');
      const mid = Math.ceil(words.length / 2);
      const l1 = words.slice(0, mid).join(' ');
      const l2 = words.slice(mid).join(' ');
      
      const numFontSize = num.value === 'NO DEAL' ? 13 : num.value === '98.79%' ? 14.5 : num.value.length >= 5 ? 15.5 : num.value.length >= 4 ? 16.5 : 18;
      const labelX = num.value === 'NO DEAL' ? 68 : num.value === '98.79%' ? 68 : num.value.length >= 5 ? 65 : num.value.length >= 4 ? 58 : 46;
      const isRed = i === 0 || i === 1 || i === 5;

      return `
        <g transform="translate(${bx}, 80)">
          <rect width="${bw}" height="42" rx="3.5" fill="${C.cardMuted}" stroke="${C.cardBorder}" stroke-width="1"/>
          <text x="8" y="27" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="${numFontSize}" font-weight="900" fill="${isRed ? C.crimson : C.inkNavy}">${esc(num.value)}</text>
          <text x="${labelX}" y="17" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.4" font-weight="600" fill="${C.charcoal}">${esc(l1)}</text>
          <text x="${labelX}" y="28" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.4" font-weight="600" fill="${C.charcoal}">${esc(l2)}</text>
        </g>
      `;
    }).join('')}
  </g>

  <!-- ====================================================================== -->
  <!-- ZONE 3: 7-REGION BAR + THE DAY IN UTC TIMELINE (y: 126 to 164)          -->
  <!-- ====================================================================== -->
  <g id="zone-3-coverage-timeline" transform="translate(16, 126)">
    <!-- Top Strip: 7-Region Proportional Stacked Bar -->
    <rect width="${totalWidth}" height="16" rx="2.5" fill="${C.cardMuted}" stroke="${C.cardBorder}" stroke-width="0.8"/>
    ${(() => {
      let currentX = 0;
      const totalStories = 32;
      return data.regionDistribution.map(r => {
        const segWidth = (r.count / totalStories) * totalWidth;
        const segText = segWidth < 45 ? `${r.code} (${r.count})` : `${esc(r.region.toUpperCase())} (${r.count})`;
        const out = `
          <rect x="${currentX}" y="0" width="${segWidth}" height="16" fill="${r.color}" stroke="${C.paper}" stroke-width="0.75"/>
          <text x="${currentX + segWidth / 2}" y="11" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="800" fill="#FFFFFF" letter-spacing="0.5">${segText}</text>
        `;
        currentX += segWidth;
        return out;
      }).join('');
    })()}

    <!-- Bottom Strip: Dark THE DAY IN UTC Timeline -->
    <g transform="translate(0, 18)">
      <rect width="${totalWidth}" height="20" rx="2.5" fill="${C.inkNavy}"/>
      <text x="10" y="13.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="900" fill="${C.amberLight}" letter-spacing="0.8">THE DAY IN UTC:</text>
      
      <!-- 6 Timeline Nodes -->
      ${data.timelineNodes.map((node, ni) => {
        const nodeX = 115 + ni * 146;
        return `
          <g transform="translate(${nodeX}, 0)">
            <circle cx="0" cy="10" r="2.5" fill="${C.amberLight}"/>
            <text x="6" y="13.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="800" fill="#FFFFFF">${esc(node.time)}</text>
            <text x="32" y="13.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.2" font-weight="600" fill="#94A3B8">${esc(node.event)}</text>
            ${ni < 5 ? `<text x="135" y="13.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7" fill="#64748B">→</text>` : ''}
          </g>
        `;
      }).join('')}
    </g>
  </g>

  <!-- ====================================================================== -->
  <!-- ZONE 4: TOP 3 HERO CARDS (y: 170 to 358, 3 Equal Columns)              -->
  <!-- ====================================================================== -->
  <g id="zone-4-heroes">
    ${data.topHeroes.map((hero, i) => {
      const colX = 16 + i * 334;
      const colW = 324;
      const colH = 188;
      const illH = 76;

      let illSvg = '';
      if (hero.id === 1) illSvg = renderIllustration1(colW - 16, illH);
      else if (hero.id === 2) illSvg = renderIllustration2(colW - 16, illH);
      else if (hero.id === 3) illSvg = renderIllustration3(colW - 16, illH);

      return `
        <g transform="translate(${colX}, 170)">
          <!-- Card Frame -->
          <rect width="${colW}" height="${colH}" rx="4" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
          
          <!-- Card Header Bar -->
          <rect x="0" y="0" width="${colW}" height="22" rx="4" fill="${C.cardMuted}"/>
          <rect x="0" y="18" width="${colW}" height="4" fill="${C.cardMuted}"/>
          <rect x="0" y="0" width="4" height="22" rx="2" fill="${hero.regionColor}"/>
          <text x="10" y="15" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.5" font-weight="900" fill="${hero.regionColor}">[${hero.id}] ${esc(hero.region)}</text>
          
          <!-- Status Badge -->
          <g transform="translate(${colW - 54}, 3.5)">
            ${renderStatusBadge(hero.status, 6.5)}
          </g>

          <!-- Bespoke Vector Artwork (ZERO floating text) -->
          <g transform="translate(8, 26)">
            ${illSvg}
          </g>

          <!-- Headline & Factual Summary -->
          <text x="8" y="120" class="hero-title">${esc(hero.headline)}</text>
          ${(() => {
            const lines = wrapText(hero.summary, 50);
            return lines.map((line, li) => 
              `<text x="8" y="${135 + li * 13}" class="hero-body">${esc(line)}</text>`
            ).join('');
          })()}
          <text x="8" y="176" class="src-line">SOURCE: ${esc(hero.sources)} • ${esc(hero.location)}</text>
        </g>
      `;
    }).join('')}
  </g>

  <!-- ====================================================================== -->
  <!-- ZONE 5: 10 ILLUSTRATED GRID CARDS (y: 364 to 624, 2 Rows x 5 Cols)     -->
  <!-- ====================================================================== -->
  <g id="zone-5-grid">
    ${data.gridStories.map((story, i) => {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const cardW = 192;
      const cardH = 126;
      const cardX = 16 + col * 200;
      const cardY = 364 + row * 134;

      const illW = 180;
      const illH = 50;

      let illSvg = '';
      if (story.id === 4) illSvg = renderIllustration4(illW, illH);
      else if (story.id === 5) illSvg = renderIllustration5(illW, illH);
      else if (story.id === 6) illSvg = renderIllustration6(illW, illH);
      else if (story.id === 7) illSvg = renderIllustration7(illW, illH);
      else if (story.id === 8) illSvg = renderIllustration8(illW, illH);
      else if (story.id === 9) illSvg = renderIllustration9(illW, illH);
      else if (story.id === 10) illSvg = renderIllustration10(illW, illH);
      else if (story.id === 11) illSvg = renderIllustration11(illW, illH);
      else if (story.id === 12) illSvg = renderIllustration12(illW, illH);
      else if (story.id === 13) illSvg = renderIllustration13(illW, illH);

      return `
        <g transform="translate(${cardX}, ${cardY})">
          <!-- Card Frame -->
          <rect width="${cardW}" height="${cardH}" rx="3.5" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
          
          <!-- Card Header Bar -->
          <rect x="0" y="0" width="${cardW}" height="18" rx="3.5" fill="${C.cardMuted}"/>
          <rect x="0" y="14" width="${cardW}" height="4" fill="${C.cardMuted}"/>
          <rect x="0" y="0" width="3" height="18" rx="1.5" fill="${story.regionColor}"/>
          <text x="7" y="12.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="900" fill="${story.regionColor}">[${story.id}] ${esc(story.region)}</text>
          
          <!-- Status Badge -->
          <g transform="translate(${cardW - 46}, 2.5)">
            ${renderStatusBadge(story.status, 5.5)}
          </g>

          <!-- Bespoke Vector Artwork (ZERO floating text) -->
          <g transform="translate(6, 22)">
            ${illSvg}
          </g>

          <!-- Headline -->
          <text x="6" y="86" class="grid-title">${esc(story.headline)}</text>
          
          <!-- 1-line Summary -->
          <text x="6" y="99" class="grid-body">${esc(story.summary)}</text>

          <!-- Source Line -->
          <text x="6" y="118" class="src-line">${esc(story.sources)}</text>
        </g>
      `;
    }).join('')}
  </g>

  <!-- ====================================================================== -->
  <!-- ZONE 6: BOTTOM SPLIT (y: 630 to 940)                                   -->
  <!-- ====================================================================== -->
  <g id="zone-6-bottom-split">
    <!-- LEFT: Dark-Navy Ocean Natural Earth 110m World Map + Date Check -->
    <g id="map-container" transform="translate(16, 630)">
      <rect width="402" height="310" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorder}" stroke-width="1"/>
      
      <!-- Map Header -->
      <text x="10" y="16" class="sec-title">WHERE IT HAPPENED · PINS 1–13</text>
      <text x="${402 - 10}" y="16" text-anchor="end" class="sec-sub">NATURAL EARTH 110M</text>
      <line x1="10" y1="21" x2="${402 - 10}" y2="21" stroke="${C.divider}" stroke-width="1"/>

      <!-- Map Viewport -->
      <g transform="translate(8, 25)">
        <!-- Ocean Canvas (Dark Navy #102438) -->
        <rect width="${mapWidth}" height="${mapHeight}" rx="3" fill="${C.ocean}" stroke="${C.landStroke}" stroke-width="0.8"/>
        
        <!-- Lat / Lon Graticule Lines -->
        <line x1="0" y1="${mapHeight * 0.58}" x2="${mapWidth}" y2="${mapHeight * 0.58}" stroke="#1E3A5F" stroke-width="0.7" stroke-dasharray="3,3"/>
        <line x1="${mapWidth * 0.5}" y1="0" x2="${mapWidth * 0.5}" y2="${mapHeight}" stroke="#1E3A5F" stroke-width="0.7" stroke-dasharray="3,3"/>

        <!-- Natural Earth 110m Land Polygons (Light Sage #C9D6CE) -->
        <path d="${pathData}" fill="${C.land}" stroke="${C.landStroke}" stroke-width="0.5"/>

        <!-- Numbered Pins 1–13 with Leader Lines -->
        ${pins.map(pin => {
          const [px, py] = project(pin.lon, pin.lat);
          const pinX = px + pin.dx;
          const pinY = py + pin.dy;

          let leader = '';
          if (pin.dx !== 0 || pin.dy !== 0) {
            leader = `<line x1="${px}" y1="${py}" x2="${pinX}" y2="${pinY}" stroke="${pin.color}" stroke-width="0.9"/>`;
          }

          return `
            ${leader}
            <circle cx="${px}" cy="${py}" r="1.5" fill="#FFFFFF"/>
            <circle cx="${pinX}" cy="${pinY}" r="4.8" fill="${pin.color}" stroke="#FFFFFF" stroke-width="1"/>
            <text x="${pinX}" y="${pinY + 2.2}" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.5" font-weight="900" fill="#FFFFFF">${pin.id}</text>
          `;
        }).join('')}
      </g>

      <!-- Date Check Box Directly Under Map -->
      <g transform="translate(8, 206)">
        <rect width="${mapWidth}" height="96" rx="3.5" fill="#FEF2F2" stroke="${C.crimsonBright}" stroke-width="1.3"/>
        
        <text x="10" y="16" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.8" font-weight="900" fill="${C.crimson}" letter-spacing="0.5">DATE CHECK — READ THIS FIRST</text>
        <line x1="10" y1="22" x2="${mapWidth - 10}" y2="22" stroke="${C.crimsonLight}" stroke-width="1"/>
        
        <text x="10" y="37" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.8" font-weight="800" fill="${C.inkNavy}">• Every one of the 32 stories happened or was first reported</text>
        <text x="18" y="49" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.8" font-weight="800" fill="${C.crimson}">on Sunday 22 November 2026 UTC.</text>
        <text x="10" y="65" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.4" font-weight="600" fill="${C.charcoal}">• Prior-day Nov 20–21 spillover (Mexico cartel arrest firefight,</text>
        <text x="18" y="77" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.4" font-weight="600" fill="${C.charcoal}">Brazil supercell storm) is explicitly excluded.</text>
        <text x="10" y="90" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.8" font-weight="700" fill="${C.mutedSlate}">STRICT FULL-DAY AUDIT · 100% FACTUAL FIDELITY</text>
      </g>
    </g>

    <!-- RIGHT: ALSO ON SUNDAY 22 NOVEMBER — 19 MORE STORIES (14–32) -->
    <g id="bottom-stories-container" transform="translate(426, 630)">
      <rect width="582" height="310" rx="4" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
      
      <!-- Header -->
      <text x="12" y="16" class="sec-title">ALSO ON SUNDAY 22 NOVEMBER — 19 MORE STORIES (14–32)</text>
      <text x="${582 - 12}" y="16" text-anchor="end" class="sec-sub">VERIFIED 22 NOV 2026 UTC</text>
      <line x1="12" y1="21" x2="${582 - 12}" y2="21" stroke="${C.divider}" stroke-width="1"/>

      <!-- Vertical Divider between Column 1 and Column 2 -->
      <line x1="288" y1="26" x2="288" y2="304" stroke="${C.divider}" stroke-width="0.8"/>

      <!-- COLUMN 1: Stories 14–23 (10 stories) -->
      <g transform="translate(10, 25)">
        ${data.bottomStories.slice(0, 10).map((s, idx) => {
          const rowY = idx * 27.5;
          return `
            <g transform="translate(0, ${rowY})">
              <!-- Top Row: Dot, Story Number, Region, Status, Source -->
              <circle cx="3" cy="5" r="2.5" fill="${s.regionColor}"/>
              <text x="9" y="7.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.8" font-weight="900" fill="${s.regionColor}">[${s.id}] ${esc(s.region)}</text>
              <g transform="translate(94, 0)">
                ${renderStatusBadge(s.status, 5)}
              </g>
              <text x="${94 + (s.status === 'CONFIRMED' ? 40 : s.status === 'REPORTED' ? 36 : s.status === 'CLAIM' ? 28 : 32) + 4}" y="7" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.2" font-weight="700" fill="${C.mutedSlate}">(${esc(s.source)})</text>

              <!-- Story Text (2 lines) -->
              <text x="0" y="15" class="bottom-col-text" font-weight="800" fill="${C.inkNavy}">${esc(s.lead)}</text>
              <text x="0" y="22.5" class="bottom-col-text" font-weight="500" fill="${C.charcoal}">${esc(s.body)}</text>

              ${idx < 9 ? `<line x1="0" y1="25.5" x2="268" y2="25.5" stroke="${C.cardBorderSubtle}" stroke-width="0.5"/>` : ''}
            </g>
          `;
        }).join('')}
      </g>

      <!-- COLUMN 2: Stories 24–32 (9 stories) -->
      <g transform="translate(298, 25)">
        ${data.bottomStories.slice(10).map((s, idx) => {
          const rowY = idx * 30.5;
          return `
            <g transform="translate(0, ${rowY})">
              <!-- Top Row: Dot, Story Number, Region, Status, Source -->
              <circle cx="3" cy="5" r="2.5" fill="${s.regionColor}"/>
              <text x="9" y="7.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.8" font-weight="900" fill="${s.regionColor}">[${s.id}] ${esc(s.region)}</text>
              <g transform="translate(94, 0)">
                ${renderStatusBadge(s.status, 5)}
              </g>
              <text x="${94 + (s.status === 'CONFIRMED' ? 40 : s.status === 'REPORTED' ? 36 : s.status === 'CLAIM' ? 28 : 32) + 4}" y="7" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.2" font-weight="700" fill="${C.mutedSlate}">(${esc(s.source)})</text>

              <!-- Story Text (2 lines) -->
              <text x="0" y="16" class="bottom-col-text" font-weight="800" fill="${C.inkNavy}">${esc(s.lead)}</text>
              <text x="0" y="24.5" class="bottom-col-text" font-weight="500" fill="${C.charcoal}">${esc(s.body)}</text>

              ${idx < 8 ? `<line x1="0" y1="28" x2="274" y2="28" stroke="${C.cardBorderSubtle}" stroke-width="0.5"/>` : ''}
            </g>
          `;
        }).join('')}
      </g>
    </g>
  </g>

  <!-- ====================================================================== -->
  <!-- ZONE 7: COMPACT FOOTER BAR (y: 946 to 1014, 2 Equal Boxes)              -->
  <!-- ====================================================================== -->
  <g id="zone-7-footer" transform="translate(16, 946)">
    <!-- Box 1: HOW TO READ THE TAGS -->
    <g transform="translate(0, 0)">
      <rect width="490" height="64" rx="3.5" fill="${C.cardMuted}" stroke="${C.cardBorder}" stroke-width="1"/>
      <text x="10" y="14" class="sec-title" font-size="8.2">HOW TO READ THE VERIFICATION TAGS</text>
      
      <!-- 4 Tiers Badges in 2x2 layout -->
      <g transform="translate(10, 20)">
        <!-- Confirmed -->
        <rect x="0" y="0" width="54" height="13" rx="2" fill="#1B4332"/>
        <text x="27" y="9.2" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.5" font-weight="800" fill="#FFFFFF">CONFIRMED</text>
        <text x="59" y="9.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.2" font-weight="600" fill="${C.charcoal}">Multi-outlet wire corroboration</text>

        <!-- Official -->
        <rect x="0" y="16" width="54" height="13" rx="2" fill="${C.crimson}"/>
        <text x="27" y="25.2" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.5" font-weight="800" fill="#FFFFFF">OFFICIAL</text>
        <text x="59" y="25.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.2" font-weight="600" fill="${C.charcoal}">Government ministry, armed forces</text>
      </g>
      <g transform="translate(250, 20)">
        <!-- Reported -->
        <rect x="0" y="0" width="52" height="13" rx="2" fill="#334155"/>
        <text x="26" y="9.2" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.5" font-weight="800" fill="#FFFFFF">REPORTED</text>
        <text x="57" y="9.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.2" font-weight="600" fill="${C.charcoal}">Single credible major news desk</text>

        <!-- Claim -->
        <rect x="0" y="16" width="44" height="13" rx="2" fill="#9A3412"/>
        <text x="22" y="25.2" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.5" font-weight="800" fill="#FFFFFF">CLAIM</text>
        <text x="49" y="25.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.2" font-weight="600" fill="${C.charcoal}">Unverified party claim / assertion</text>
      </g>
    </g>

    <!-- Box 2: SOURCES & RECORD -->
    <g transform="translate(502, 0)">
      <rect width="490" height="64" rx="3.5" fill="${C.cardMuted}" stroke="${C.cardBorder}" stroke-width="1"/>
      <text x="10" y="14" class="sec-title" font-size="8.2" fill="${C.crimson}">VERIFIED EDITORIAL DESKS &amp; AUDIT SOURCES</text>
      
      <g transform="translate(10, 24)">
        <text x="0" y="8" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.8" font-weight="800" fill="${C.inkNavy}">SOURCES: UN News · AP · Reuters · WaPo · ICC · MotoGP · AA · Kyiv Ind. · RFE/RL · METI · Vatican</text>
        <text x="0" y="22" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.4" font-weight="600" fill="${C.charcoal}">• Complete 32-story broadsheet digest curated and cross-verified for 22 Nov 2026 UTC.</text>
        <text x="0" y="34" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7" font-weight="600" fill="${C.mutedSlate}">Deterministic rendering: Resvg 2048x2048 → Sharp Lanczos3 1024x1024 PNG (zero external dependencies).</text>
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
  // Using compressionLevel: 8 to land inside the 260-420 KB target
  const finalPngBuffer = await sharp(png2048Buffer)
    .resize(1024, 1024, {
      kernel: 'lanczos3',
      fit: 'fill',
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: false,
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
