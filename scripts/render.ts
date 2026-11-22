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

  const w = status === 'CONFIRMED' ? 58 : status === 'REPORTED' ? 52 : 44;
  const h = fontSize + 6.5;

  return `
    <rect width="${w}" height="${h}" rx="2.5" fill="${cfg.bg}"/>
    <text x="${w / 2}" y="${h - 4}" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="${cfg.text}" letter-spacing="0.7">${cfg.label}</text>
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

// 1. COP31 Antalya Summit: Cantilever Pavilion & Coastal Wind Turbines
function renderIllustration1(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Mediterranean Mountain Ridgeline -->
    <path d="M 0,${h - 18} L 45,${h - 48} L 95,${h - 32} L 155,${h - 58} L 225,${h - 30} L ${w},${h - 18} L ${w},${h} L 0,${h} Z" fill="#DDE4EA"/>
    <polygon points="155,${h - 58} 165,${h - 46} 145,${h - 46}" fill="#FFFFFF" opacity="0.9"/>
    <!-- Coastline Water -->
    <rect x="0" y="${h - 18}" width="${w}" height="18" fill="#D2DFE6"/>
    <line x1="8" y1="${h - 10}" x2="${w - 8}" y2="${h - 10}" stroke="#9BB3BF" stroke-width="1" stroke-dasharray="8,5"/>
    <!-- Offshore Wind Turbines -->
    <g transform="translate(${w - 38}, ${h - 36})">
      <line x1="0" y1="20" x2="0" y2="0" stroke="${C.steelDark}" stroke-width="1.2"/>
      <circle cx="0" cy="0" r="1.5" fill="${C.steelDark}"/>
      <line x1="0" y1="0" x2="-8" y2="-6" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="0" y1="0" x2="9" y2="-3" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="0" y1="0" x2="-1" y2="9" stroke="${C.steelMid}" stroke-width="1"/>
    </g>
    <!-- Modern Cantilever Pavilion Architecture -->
    <polygon points="18,${h - 18} 180,${h - 18} 210,${h - 6} 8,${h - 6}" fill="${C.steelDark}"/>
    <polygon points="26,${h - 62} 160,${h - 76} 175,${h - 50} 46,${h - 38}" fill="${C.steelDark}"/>
    <polygon points="36,${h - 64} 168,${h - 78} 173,${h - 68} 44,${h - 56}" fill="${C.steelMid}"/>
    <!-- Glass Facade & Columns -->
    <polygon points="46,${h - 38} 175,${h - 50} 170,${h - 18} 42,${h - 18}" fill="#C8D8E2" opacity="0.85"/>
    <line x1="72" y1="${h - 41}" x2="68" y2="${h - 18}" stroke="${C.steelDark}" stroke-width="2"/>
    <line x1="104" y1="${h - 44}" x2="100" y2="${h - 18}" stroke="${C.steelDark}" stroke-width="2"/>
    <line x1="136" y1="${h - 47}" x2="132" y2="${h - 18}" stroke="${C.steelDark}" stroke-width="2"/>
    <!-- Flags atop roof -->
    <line x1="32" y1="${h - 62}" x2="32" y2="${h - 84}" stroke="${C.inkNavy}" stroke-width="1.5"/>
    <polygon points="32,${h - 84} 46,${h - 79} 32,${h - 74}" fill="${C.crimson}"/>
    <line x1="82" y1="${h - 68}" x2="82" y2="${h - 88}" stroke="${C.inkNavy}" stroke-width="1.5"/>
    <polygon points="82,${h - 88} 96,${h - 83} 82,${h - 78}" fill="${C.steelMid}"/>
  `;
}

// 2. Saudi Air Defense: Geodesic Dome, Interception Arc & Kinetic Deflection
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
    <path d="M ${w - 18},16 Q ${w - 55},42 ${w - 95},60" fill="none" stroke="${C.inkNavy}" stroke-width="1.5" stroke-dasharray="4,2"/>
    <!-- Crimson Interceptor Arc -->
    <path d="M 48,${h - 46} Q 105,24 ${w - 95},60" fill="none" stroke="${C.crimson}" stroke-width="2.6"/>
    <!-- Kinetic Starburst Impact Point -->
    <g transform="translate(${w - 95}, 60)">
      <circle cx="0" cy="0" r="15" fill="${C.crimsonLight}" opacity="0.6"/>
      <circle cx="0" cy="0" r="8" fill="${C.crimson}" opacity="0.4"/>
      <circle cx="0" cy="0" r="3" fill="${C.crimson}"/>
      <line x1="-12" y1="0" x2="12" y2="0" stroke="${C.crimson}" stroke-width="2"/>
      <line x1="0" y1="-12" x2="0" y2="12" stroke="${C.crimson}" stroke-width="2"/>
    </g>
    <!-- Deflected Missile Silhouette -->
    <g transform="translate(${w - 74}, 44) rotate(-42)">
      <polygon points="0,-14 4,2 2,12 -2,12 -4,2" fill="${C.inkNavy}"/>
      <polygon points="2,5 7,12 2,10" fill="${C.steelDark}"/>
      <polygon points="-2,5 -7,12 -2,10" fill="${C.steelDark}"/>
    </g>
  `;
}

// 3. US-China Data Center Curb: Server Blades, Optical Transceivers & Circuit Bus
function renderIllustration3(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Server Rack Tower Chassis -->
    <g transform="translate(14, 10)">
      <rect x="0" y="0" width="76" height="${h - 20}" rx="3" fill="${C.inkNavy}"/>
      <rect x="3" y="3" width="70" height="${h - 26}" rx="1.5" fill="${C.steelDark}"/>
      ${[0, 1, 2, 3].map(i => {
        const sy = 6 + i * 15;
        return `
          <rect x="6" y="${sy}" width="64" height="12" rx="1" fill="${C.inkNavy}" stroke="${C.steelMid}" stroke-width="0.8"/>
          <line x1="10" y1="${sy + 4}" x2="32" y2="${sy + 4}" stroke="${C.steelMid}" stroke-width="1"/>
          <line x1="10" y1="${sy + 8}" x2="32" y2="${sy + 8}" stroke="${C.steelMid}" stroke-width="1"/>
          <circle cx="44" cy="${sy + 6}" r="1.6" fill="${i === 1 ? C.crimson : '#10B981'}"/>
          <circle cx="50" cy="${sy + 6}" r="1.6" fill="${C.steelLight}"/>
          <rect x="56" y="${sy + 3}" width="10" height="6" rx="0.8" fill="${C.steelMid}"/>
        `;
      }).join('')}
    </g>
    <!-- Optical Transceiver Semiconductor Hub -->
    <g transform="translate(102, 14)">
      <!-- Circuit Bus Lines -->
      <path d="M 0,16 H 32 V 32 H 75" fill="none" stroke="${C.steelMid}" stroke-width="1.8"/>
      <path d="M 0,38 H 45 V 50 H 98" fill="none" stroke="${C.steelDark}" stroke-width="1.8"/>
      <!-- Blocked Import Trace (Crimson Dashed) -->
      <path d="M 0,56 H 25 V 68 H 68 V 56 H 92" fill="none" stroke="${C.crimson}" stroke-width="2" stroke-dasharray="4,2"/>
      <!-- Nodes -->
      <circle cx="32" cy="32" r="3" fill="${C.steelDark}"/>
      <circle cx="75" cy="32" r="3.5" fill="${C.steelMid}"/>
      <circle cx="45" cy="50" r="3" fill="${C.steelDark}"/>
      <circle cx="98" cy="50" r="4" fill="${C.steelDark}"/>
      <circle cx="68" cy="56" r="3.5" fill="${C.crimson}"/>
      <!-- Optical Chip Package -->
      <g transform="translate(62, 8)">
        <rect x="0" y="0" width="26" height="26" rx="2" fill="${C.steelDark}" stroke="${C.inkNavy}" stroke-width="1.2"/>
        <rect x="5" y="5" width="16" height="16" fill="${C.cardBg}"/>
        <circle cx="13" cy="13" r="3.5" fill="${C.crimson}"/>
      </g>
    </g>
  `;
}

// 4. Poland Airspace Alert: Tactical Radar PPI Scope
function renderIllustration4(w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.42;
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#E4DFD2" stroke="${C.inkNavy}" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.68}" fill="none" stroke="#9BB3BF" stroke-width="1" stroke-dasharray="2,2"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.35}" fill="none" stroke="#9BB3BF" stroke-width="0.8"/>
    <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${C.steelMid}" stroke-width="1"/>
    <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="${C.steelMid}" stroke-width="1"/>
    <!-- Sweep Wedge -->
    <path d="M ${cx},${cy} L ${cx + r * 0.9},${cy - r * 0.4} A ${r} ${r} 0 0 0 ${cx + r * 0.55},${cy - r * 0.8} Z" fill="${C.steelMid}" opacity="0.35"/>
    <!-- Frontier Demarcation -->
    <path d="M ${cx - 24},${cy - r * 0.8} Q ${cx - 6},${cy} ${cx - 20},${cy + r * 0.8}" fill="none" stroke="${C.steelDark}" stroke-width="1.5" stroke-dasharray="4,2"/>
    <!-- Friendly Flight Track -->
    <circle cx="${cx - 16}" cy="${cy + 14}" r="2.5" fill="${C.steelDark}"/>
    <line x1="${cx - 16}" y1="${cy + 14}" x2="${cx - 8}" y2="${cy + 6}" stroke="${C.steelDark}" stroke-width="1.2"/>
    <!-- Incursion Alert Beacon -->
    <circle cx="${cx + 18}" cy="${cy - 16}" r="6" fill="none" stroke="${C.crimson}" stroke-width="1.2" stroke-dasharray="2,1.5"/>
    <circle cx="${cx + 18}" cy="${cy - 16}" r="3" fill="${C.crimson}"/>
    <line x1="${cx + 18}" y1="${cy - 16}" x2="${cx + 4}" y2="${cy - 6}" stroke="${C.crimson}" stroke-width="1.6"/>
    <polygon points="${cx + 4},${cy - 6} ${cx + 9},${cy - 6} ${cx + 6},${cy - 10}" fill="${C.crimson}"/>
  `;
}

// 5. Bahrain Demands UN Action: Industrial Skyline & Neoclassical Diplomatic Motif
function renderIllustration5(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Manama Coastal Industrial Skyline -->
    <g transform="translate(10, ${h - 28})">
      <rect x="0" y="-28" width="14" height="28" fill="${C.steelDark}"/>
      <line x1="7" y1="-38" x2="7" y2="-28" stroke="${C.inkNavy}" stroke-width="1.5"/>
      <ellipse cx="24" cy="-12" rx="12" ry="14" fill="${C.steelMid}"/>
      <rect x="12" y="-12" width="24" height="14" fill="${C.steelMid}"/>
      <rect x="42" y="-36" width="10" height="36" fill="${C.steelDark}"/>
      <line x1="47" y1="-46" x2="47" y2="-36" stroke="${C.inkNavy}" stroke-width="1.5"/>
      <polygon points="45,-46 47,-52 49,-46" fill="${C.crimson}"/>
    </g>
    <!-- UN Diplomatic Portico & Gavel Silhouette -->
    <g transform="translate(${w - 38}, 16)">
      <polygon points="-16,8 16,8 0,-4" fill="${C.steelDark}"/>
      <rect x="-14" y="8" width="28" height="2.5" fill="${C.steelDark}"/>
      <line x1="-10" y1="10.5" x2="-10" y2="34" stroke="${C.steelDark}" stroke-width="2"/>
      <line x1="-3" y1="10.5" x2="-3" y2="34" stroke="${C.steelDark}" stroke-width="2"/>
      <line x1="4" y1="10.5" x2="4" y2="34" stroke="${C.steelDark}" stroke-width="2"/>
      <line x1="11" y1="10.5" x2="11" y2="34" stroke="${C.steelDark}" stroke-width="2"/>
      <rect x="-16" y="34" width="32" height="3" fill="${C.steelDark}"/>
      <!-- Gavel Silhouette -->
      <g transform="translate(2, 46) rotate(32)">
        <rect x="-7" y="-3" width="14" height="6" rx="1" fill="${C.crimson}"/>
        <rect x="-2" y="3" width="4" height="14" rx="0.8" fill="${C.inkNavy}"/>
      </g>
    </g>
  `;
}

// 6. Nigeria Boat Capsizes: Solemn Ocean Swells & Overturned Vessel
function renderIllustration6(w: number, h: number): string {
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
    <!-- Capsized Boat Silhouette -->
    <g transform="translate(48, ${h * 0.52}) rotate(26)">
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

// 7. Japan Bans 4 Chemicals: Molecular Ring & Laboratory Flask
function renderIllustration7(w: number, h: number): string {
  const cx = w / 2;
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Hexagonal Benzene Ring Molecule -->
    <g transform="translate(32, 28)">
      <polygon points="18,0 34,9 34,27 18,36 2,27 2,9" fill="none" stroke="${C.steelDark}" stroke-width="1.8"/>
      <polygon points="18,5 30,12 30,24 18,31 6,24 6,12" fill="none" stroke="${C.steelMid}" stroke-width="1" stroke-dasharray="3,2"/>
      <circle cx="18" cy="0" r="2.5" fill="${C.steelDark}"/>
      <circle cx="34" cy="9" r="2.5" fill="${C.steelDark}"/>
      <circle cx="34" cy="27" r="2.5" fill="${C.steelDark}"/>
      <circle cx="18" cy="36" r="2.5" fill="${C.crimson}"/>
      <circle cx="2" cy="27" r="2.5" fill="${C.steelDark}"/>
      <circle cx="2" cy="9" r="2.5" fill="${C.steelDark}"/>
    </g>
    <!-- Erlenmeyer Chemistry Flask & Liquid Level -->
    <g transform="translate(${cx + 12}, 20)">
      <polygon points="12,0 18,0 18,12 32,38 32,42 -2,42 -2,38 12,12" fill="none" stroke="${C.inkNavy}" stroke-width="1.8"/>
      <polygon points="3,34 27,34 30,40 0,40" fill="${C.steelLight}" opacity="0.85"/>
      <circle cx="12" cy="37" r="1.5" fill="${C.crimson}"/>
      <circle cx="18" cy="36" r="1.2" fill="${C.steelDark}"/>
      <line x1="8" y1="26" x2="13" y2="26" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="6" y1="31" x2="12" y2="31" stroke="${C.steelMid}" stroke-width="1"/>
    </g>
    <!-- Prohibition Slash Motif -->
    <g transform="translate(${w - 20}, ${h - 20})">
      <circle cx="0" cy="0" r="10" fill="none" stroke="${C.crimson}" stroke-width="2"/>
      <line x1="-7" y1="-7" x2="7" y2="7" stroke="${C.crimson}" stroke-width="2"/>
    </g>
  `;
}

// 8. Paolo Bulgari Dies at 89: Classical Roman Facade & Octagonal Gem Facet
function renderIllustration8(w: number, h: number): string {
  const cx = w / 2;
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Classical Roman Architectural Temple Facade -->
    <g transform="translate(18, 16)">
      <polygon points="0,14 44,14 22,0" fill="${C.steelDark}"/>
      <rect x="2" y="14" width="40" height="3" fill="${C.steelDark}"/>
      <line x1="6" y1="17" x2="6" y2="52" stroke="${C.steelDark}" stroke-width="2.5"/>
      <line x1="17" y1="17" x2="17" y2="52" stroke="${C.steelDark}" stroke-width="2.5"/>
      <line x1="27" y1="17" x2="27" y2="52" stroke="${C.steelDark}" stroke-width="2.5"/>
      <line x1="38" y1="17" x2="38" y2="52" stroke="${C.steelDark}" stroke-width="2.5"/>
      <rect x="0" y="52" width="44" height="4" fill="${C.steelDark}"/>
    </g>
    <!-- Octagonal Step-cut Emerald / Gemstone Silhouette -->
    <g transform="translate(${cx + 14}, 22)">
      <polygon points="8,0 24,0 32,8 32,24 24,32 8,32 0,24 0,8" fill="#DDE5EB" stroke="${C.inkNavy}" stroke-width="1.8"/>
      <polygon points="12,5 20,5 25,10 25,22 20,27 12,27 7,22 7,10" fill="none" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="8" y1="0" x2="12" y2="5" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="24" y1="0" x2="20" y2="5" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="32" y1="8" x2="25" y2="10" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="32" y1="24" x2="25" y2="22" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="24" y1="32" x2="20" y2="27" stroke="${C.steelMid}" stroke-width="1"/>
      <line x1="8" y1="32" x2="12" y2="27" stroke="${C.steelMid}" stroke-width="1"/>
      <circle cx="16" cy="16" r="3" fill="${C.crimson}"/>
    </g>
  `;
}

// 9. Bougainville Relief Aid: Pacific Coastline & Humanitarian Cargo Airlift
function renderIllustration9(w: number, h: number): string {
  return `
    <rect width="${w}" height="${h}" rx="4" fill="${C.cardMuted}" stroke="${C.cardBorderSubtle}" stroke-width="1"/>
    <!-- Tropical Island Volcanic Ridge & Palms -->
    <path d="M 0,${h - 16} L 32,${h - 42} L 68,${h - 26} L 110,${h - 52} L 155,${h - 20} L ${w},${h - 16} L ${w},${h} L 0,${h} Z" fill="#D2DDD8"/>
    <rect x="0" y="${h - 16}" width="${w}" height="16" fill="#C5D8D4"/>
    <!-- Palm Silhouette -->
    <g transform="translate(24, ${h - 16})">
      <path d="M 0,0 Q -4,-18 -10,-24" fill="none" stroke="${C.steelDark}" stroke-width="2"/>
      <line x1="-10" y1="-24" x2="-20" y2="-28" stroke="${C.steelDark}" stroke-width="1.2"/>
      <line x1="-10" y1="-24" x2="-14" y2="-34" stroke="${C.steelDark}" stroke-width="1.2"/>
      <line x1="-10" y1="-24" x2="-2" y2="-32" stroke="${C.steelDark}" stroke-width="1.2"/>
      <line x1="-10" y1="-24" x2="-3" y2="-22" stroke="${C.steelDark}" stroke-width="1.2"/>
    </g>
    <!-- Humanitarian Cargo Airlift Aircraft (C-130 Silhouette) -->
    <g transform="translate(${w - 38}, 22)">
      <path d="M -24,0 L 16,0 L 22,-3 L 20,4 L 14,4 L -20,3 Z" fill="${C.inkNavy}"/>
      <polygon points="-6,-16 0,-16 2,16 -4,16" fill="${C.steelDark}"/>
      <polygon points="12,-8 18,-8 14,0 10,0" fill="${C.inkNavy}"/>
      <g transform="translate(-14, 20)">
        <path d="M -10,0 A 10 10 0 0 1 10,0 Z" fill="${C.crimson}"/>
        <line x1="-10" y1="0" x2="0" y2="10" stroke="${C.steelDark}" stroke-width="0.8"/>
        <line x1="10" y1="0" x2="0" y2="10" stroke="${C.steelDark}" stroke-width="0.8"/>
        <rect x="-3" y="10" width="6" height="6" fill="${C.steelDark}"/>
      </g>
    </g>
  `;
}

// ============================================================================
// SVG BUILDER: 17-STORY, 7-REGION BROADSHEET FRONT PAGE
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
    { id: 1, name: 'Antalya', lat: 36.9, lon: 30.7, color: C.regGlobal, dx: 4, dy: -3 },
    { id: 2, name: 'Mecca', lat: 21.4, lon: 39.8, color: C.regMidEast, dx: -5, dy: 6 },
    { id: 3, name: 'Washington DC', lat: 38.9, lon: -77.0, color: C.regAmericas, dx: 0, dy: 0 },
    { id: 4, name: 'Warsaw', lat: 52.2, lon: 21.0, color: C.regEurope, dx: 0, dy: -5 },
    { id: 5, name: 'Manama', lat: 26.2, lon: 50.6, color: C.regMidEast, dx: 6, dy: -4 },
    { id: 6, name: 'Nigeria', lat: 9.1, lon: 7.4, color: C.regAfrica, dx: 0, dy: 0 },
    { id: 7, name: 'Tokyo', lat: 35.7, lon: 139.7, color: C.regAsia, dx: 0, dy: 0 },
    { id: 8, name: 'Rome', lat: 41.9, lon: 12.5, color: C.regEurope, dx: -6, dy: 0 },
    { id: 9, name: 'Bougainville', lat: -6.2, lon: 155.4, color: C.regOceania, dx: 0, dy: 0 },
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
        font-size: 11.2px;
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
      .bottom-story-text {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 10px;
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
      <text x="144" y="21" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.5" font-weight="800" fill="${C.crimsonLight}" letter-spacing="1.5">GLOBAL EDITION • 24-HOUR RECORD</text>
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
      const l1 = words.slice(0, 3).join(' ');
      const l2 = words.slice(3).join(' ');
      const numFontSize = num.value.length >= 5 ? 15.5 : num.value.length === 4 ? 16.5 : 17.5;
      const labelX = num.value.length >= 5 ? 65 : num.value.length >= 4 ? 58 : num.value.length === 3 ? 48 : 36;
      return `
        <g transform="translate(${bx}, 84)">
          <rect width="${bw}" height="40" rx="3.5" fill="${C.cardMuted}" stroke="${C.cardBorder}" stroke-width="1"/>
          <text x="10" y="26" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="${numFontSize}" font-weight="900" fill="${i === 1 || i === 2 ? C.crimson : C.inkNavy}">${esc(num.value)}</text>
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
      const totalStories = 17;
      return data.regionDistribution.map(r => {
        const segWidth = (r.count / totalStories) * totalWidth;
        const out = `
          <rect x="${currentX}" y="0" width="${segWidth}" height="20" fill="${r.color}" stroke="${C.paper}" stroke-width="0.75"/>
          <text x="${currentX + segWidth / 2}" y="13.5" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.2" font-weight="800" fill="#FFFFFF" letter-spacing="0.6">${esc(r.region.toUpperCase())} (${r.count})</text>
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
          <g transform="translate(106, 12)">
            <!-- Header Tag & Badge -->
            <rect x="0" y="0" width="3" height="14" rx="1.5" fill="${story.regionColor}"/>
            <text x="8" y="11" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.5" font-weight="900" fill="${story.regionColor}">[${story.id}] ${esc(story.region)}</text>
            <g transform="translate(${cardW - 162}, 0)">
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
          <text x="13" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Antalya: COP31 Deal</text>

          <circle cx="134" cy="-2.5" r="4.5" fill="${C.regMidEast}"/>
          <text x="134" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">2</text>
          <text x="142" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">W. Saudi: Missile Intercept</text>

          <circle cx="268" cy="-2.5" r="4.5" fill="${C.regAmericas}"/>
          <text x="268" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">3</text>
          <text x="276" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Washington: Tech Curb</text>
        </g>

        <!-- Row 2 -->
        <g transform="translate(0, 42)">
          <circle cx="5" cy="-2.5" r="4.5" fill="${C.regEurope}"/>
          <text x="5" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">4</text>
          <text x="13" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Poland: Airspace Alert</text>

          <circle cx="134" cy="-2.5" r="4.5" fill="${C.regMidEast}"/>
          <text x="134" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">5</text>
          <text x="142" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Bahrain: UN Action Call</text>

          <circle cx="268" cy="-2.5" r="4.5" fill="${C.regAfrica}"/>
          <text x="268" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">6</text>
          <text x="276" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Nigeria: Boat Tragedy</text>
        </g>

        <!-- Row 3 -->
        <g transform="translate(0, 70)">
          <circle cx="5" cy="-2.5" r="4.5" fill="${C.regAsia}"/>
          <text x="5" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">7</text>
          <text x="13" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Japan: 4 Chemical Bans</text>

          <circle cx="134" cy="-2.5" r="4.5" fill="${C.regEurope}"/>
          <text x="134" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">8</text>
          <text x="142" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Rome: Paolo Bulgari Dies</text>

          <circle cx="268" cy="-2.5" r="4.5" fill="${C.regOceania}"/>
          <text x="268" y="0" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6" font-weight="900" fill="#FFFFFF">9</text>
          <text x="276" y="0" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.inkNavy}">Bougainville: Relief Aid</text>
        </g>
      </g>
    </g>

    <!-- RIGHT: 8 MORE STORIES (10–17) -->
    <g id="bottom-stories-container" transform="translate(444, 632)">
      <rect width="564" height="314" rx="5" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
      
      <!-- Header -->
      <text x="14" y="18" class="sec-title">8 MORE STORIES ACROSS 5 REGIONS (10–17)</text>
      <text x="${564 - 14}" y="18" text-anchor="end" class="sec-sub">VERIFIED 22 NOV 2026 DISPATCHES</text>
      <line x1="14" y1="24" x2="${564 - 14}" y2="24" stroke="${C.divider}" stroke-width="1"/>

      <!-- 8 Story Rows -->
      <g transform="translate(14, 28)">
        ${data.bottomStories.map((s, idx) => {
          const rowY = idx * 35;
          const badgeX = 104;
          const badgeW = s.status === 'CONFIRMED' ? 58 : s.status === 'REPORTED' ? 52 : 44;
          const srcX = badgeX + badgeW + 6;
          return `
            <g transform="translate(0, ${rowY})">
              <!-- Story Number Pill -->
              <rect x="0" y="2" width="22" height="13" rx="2.5" fill="${s.regionColor}"/>
              <text x="11" y="11.5" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="900" fill="#FFFFFF">${s.id}</text>
              
              <!-- Region Name -->
              <text x="26" y="12" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="800" fill="${s.regionColor}">${esc(s.region)}</text>
              
              <!-- Source & Status Pill -->
              <g transform="translate(${badgeX}, 1)">
                ${renderStatusBadge(s.status, 6)}
              </g>
              <text x="${srcX}" y="11.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="700" fill="${C.mutedSlate}">(${esc(s.source)})</text>

              <!-- Main Story Text (>= 10px dark ink #0F172A) -->
              <text x="0" y="27" class="bottom-story-text">
                <tspan font-weight="800" fill="${C.inkNavy}">${esc(s.lead)}</tspan>
                <tspan font-weight="500" fill="${C.charcoal}"> ${esc(s.body)}</tspan>
              </text>

              ${idx < 7 ? `<line x1="0" y1="33" x2="${564 - 28}" y2="33" stroke="${C.cardBorderSubtle}" stroke-width="0.75"/>` : ''}
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
      <text x="12" y="16" class="sec-title" font-size="9" fill="${C.crimson}">DATE CHECK · STRICT 22 NOVEMBER 2026 UTC</text>
      
      <g transform="translate(12, 26)">
        <text x="0" y="10" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.5" font-weight="700" fill="${C.inkNavy}">• All 17 events occurred or were first reported on 22 November 2026.</text>
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
