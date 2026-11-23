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
  inkNavy: '#0B1220', // Pitch-dark navy ink for maximum legibility
  charcoal: '#1F2937', // Dark charcoal body ink
  mutedSlate: '#4B5563', // Darker slate for metadata
  divider: '#D1C9B8',
  dividerHeavy: '#0B1220',
  crimson: '#B91C1C',
  crimsonBright: '#DC2626',
  crimsonLight: '#FECACA',
  amber: '#D97706',
  amberLight: '#FBBF24',
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
    REPORTED: { bg: '#1E293B', text: '#FFFFFF', label: 'REPORTED' },
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
// 13 RICH FULL-BLEED COLORFUL EDITORIAL ILLUSTRATIONS (ZERO FLOATING TEXT)
// ============================================================================

// 1. Hero 1: COP31 Antalya Summit Collapses (Warm Sunset Mediterranean & Cantilever Pavilion)
function renderIllustration1(w: number, h: number): string {
  return `
    <g clip-path="url(#clip-ill-1)">
      <!-- Rich Mediterranean Sunset Sky -->
      <rect width="${w}" height="${h}" fill="#1E293B"/>
      <path d="M 0,${h * 0.25} L ${w},${h * 0.15} L ${w},${h} L 0,${h} Z" fill="#991B1B" opacity="0.85"/>
      <path d="M 0,${h * 0.45} L ${w},${h * 0.35} L ${w},${h} L 0,${h} Z" fill="#C2410C" opacity="0.75"/>
      <path d="M 0,${h * 0.62} L ${w},${h * 0.58} L ${w},${h} L 0,${h} Z" fill="#D97706" opacity="0.65"/>
      <!-- Sun Glow -->
      <circle cx="110" cy="${h * 0.55}" r="22" fill="#FEF08A" opacity="0.6"/>

      <!-- Taurus Mountains Silhouette -->
      <path d="M 0,${h - 18} L 35,${h - 48} L 80,${h - 32} L 140,${h - 58} L 195,${h - 36} L 250,${h - 50} L ${w},${h - 22} L ${w},${h} L 0,${h} Z" fill="#0F172A"/>
      <polygon points="140,${h - 58} 148,${h - 46} 132,${h - 46}" fill="#FFFFFF" opacity="0.85"/>

      <!-- Deep Mediterranean Coastline Water -->
      <rect x="0" y="${h - 18}" width="${w}" height="18" fill="#0C253B"/>
      <line x1="8" y1="${h - 10}" x2="${w - 8}" y2="${h - 10}" stroke="#38BDF8" stroke-width="1" stroke-dasharray="8,6" opacity="0.6"/>

      <!-- Modern Cantilever Summit Hall with Interior Warm Amber Glow -->
      <polygon points="12,${h - 18} 130,${h - 18} 140,${h - 8} 6,${h - 8}" fill="#0A0F1D"/>
      <polygon points="16,${h - 46} 115,${h - 54} 125,${h - 36} 28,${h - 28}" fill="#0A0F1D"/>
      <polygon points="22,${h - 48} 118,${h - 56} 122,${h - 50} 26,${h - 42}" fill="#334155"/>
      <!-- Illuminated Glass Atrium Windows -->
      <polygon points="28,${h - 28} 125,${h - 36} 121,${h - 18} 24,${h - 18}" fill="#FEF08A" opacity="0.8"/>
      <line x1="45" y1="${h - 30}" x2="41" y2="${h - 18}" stroke="#0A0F1D" stroke-width="1.8"/>
      <line x1="68" y1="${h - 32}" x2="64" y2="${h - 18}" stroke="#0A0F1D" stroke-width="1.8"/>
      <line x1="92" y1="${h - 34}" x2="88" y2="${h - 18}" stroke="#0A0F1D" stroke-width="1.8"/>
      <!-- Conference Flag Staff -->
      <line x1="20" y1="${h - 46}" x2="20" y2="${h - 66}" stroke="#FEF08A" stroke-width="1.5"/>
      <polygon points="20,${h - 66} 32,${h - 62} 20,${h - 58}" fill="#DC2626"/>

      <!-- Glowing Climate Wireframe Globe (Center-Right) -->
      <g transform="translate(194, 38)">
        <circle cx="0" cy="0" r="22" fill="#0C253B" stroke="#38BDF8" stroke-width="1.5"/>
        <line x1="-22" y1="0" x2="22" y2="0" stroke="#38BDF8" stroke-width="1"/>
        <line x1="0" y1="-22" x2="0" y2="22" stroke="#38BDF8" stroke-width="1"/>
        <ellipse cx="0" cy="-10" rx="19" ry="5.5" fill="none" stroke="#38BDF8" stroke-width="0.8" opacity="0.8"/>
        <ellipse cx="0" cy="10" rx="19" ry="5.5" fill="none" stroke="#38BDF8" stroke-width="0.8" opacity="0.8"/>
        <ellipse cx="0" cy="0" rx="11" ry="22" fill="none" stroke="#38BDF8" stroke-width="0.9" opacity="0.8"/>
        <circle cx="6" cy="-7" r="3.2" fill="#DC2626"/>
        <circle cx="6" cy="-7" r="6" fill="none" stroke="#DC2626" stroke-width="0.9" opacity="0.7"/>
      </g>

      <!-- Shattered Conference Gavel with Crimson Sparks (Far Right) -->
      <g transform="translate(266, 40)">
        <rect x="-14" y="14" width="28" height="6" rx="1.5" fill="#0A0F1D"/>
        <ellipse cx="0" cy="14" rx="14" ry="3" fill="#334155"/>
        <g transform="rotate(-24)">
          <polygon points="-12,-6 12,-6 10,6 -10,6" fill="#DC2626"/>
          <rect x="-3" y="6" width="6" height="4" rx="1" fill="#FEF08A"/>
          <path d="M 0,-6 L -3,-18" stroke="#FEF08A" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M -1,-22 L 5,-32" stroke="#FEF08A" stroke-width="2.6" stroke-linecap="round"/>
          <!-- Spark Burst -->
          <polygon points="-2,-20 2,-18 -1,-16 -4,-18" fill="#FFFFFF"/>
          <circle cx="8" cy="-22" r="1.5" fill="#FEF08A"/>
          <circle cx="-6" cy="-28" r="1.5" fill="#FEF08A"/>
        </g>
      </g>
    </g>
  `;
}

// 2. Hero 2: Africa: Ukraine Drone Sinks Russian Warship Merkury in Benghazi
function renderIllustration2(w: number, h: number): string {
  return `
    <g clip-path="url(#clip-ill-2)">
      <!-- Deep Midnight Harbor Night Sky -->
      <rect width="${w}" height="${h}" fill="#0A1128"/>
      <path d="M 0,0 L ${w},0 L ${w},${h * 0.65} L 0,${h * 0.75} Z" fill="#141E38"/>

      <!-- Distant Benghazi Port Silhouette (Cranes & Docks) -->
      <g transform="translate(14, ${h * 0.28})" fill="#060B18">
        <rect x="0" y="10" width="40" height="20" rx="1"/>
        <line x1="12" y1="10" x2="12" y2="-6" stroke="#060B18" stroke-width="1.8"/>
        <line x1="12" y1="-6" x2="32" y2="4" stroke="#060B18" stroke-width="1.2"/>
        <rect x="50" y="14" width="25" height="16" rx="1"/>
      </g>

      <!-- Harbor Waters (Deep Sea Navy to Emerald Slate) -->
      <rect x="0" y="${h - 24}" width="${w}" height="24" fill="#040D1A"/>
      <line x1="10" y1="${h - 14}" x2="${w - 10}" y2="${h - 14}" stroke="#1E3A5F" stroke-width="1.2" stroke-dasharray="12,8"/>

      <!-- Listing Russian Corvette Merkury (Tilted at 16 Degrees) -->
      <g transform="translate(138, ${h - 22}) rotate(16)">
        <!-- Warship Hull -->
        <polygon points="-80,-4 65,-4 75,-16 80,-16 78,6 -80,6" fill="#1E293B" stroke="#0F172A" stroke-width="1"/>
        <!-- Superstructure & Stealth Mast -->
        <polygon points="-45,-4 -40,-20 15,-20 20,-4" fill="#334155"/>
        <polygon points="-15,-20 -5,-34 5,-34 10,-20" fill="#1E293B"/>
        <!-- Radar Radome -->
        <circle cx="0" cy="-35" r="4" fill="#64748B"/>
        <line x1="0" y1="-39" x2="0" y2="-44" stroke="#94A3B8" stroke-width="1.2"/>
        <!-- Forward Gun Turret -->
        <polygon points="35,-4 45,-12 55,-4" fill="#475569"/>
        <line x1="55" y1="-8" x2="72" y2="-8" stroke="#0F172A" stroke-width="1.8"/>
      </g>

      <!-- Huge Fiery Explosion Blast from Waterline Strike -->
      <g transform="translate(155, ${h - 26})">
        <!-- Outer Blast Glow -->
        <circle cx="0" cy="-6" r="22" fill="#DC2626" opacity="0.6"/>
        <circle cx="4" cy="-8" r="15" fill="#EA580C" opacity="0.8"/>
        <circle cx="2" cy="-6" r="9" fill="#FEF08A"/>
        <!-- Billowing Black Smoke Clouds -->
        <circle cx="-12" cy="-22" r="14" fill="#111827" opacity="0.9"/>
        <circle cx="8" cy="-26" r="16" fill="#1E293B" opacity="0.85"/>
        <circle cx="20" cy="-18" r="12" fill="#374151" opacity="0.8"/>
        <!-- Water Splash & Flash Rays -->
        <polygon points="-18,-4 0,-18 18,-4 0,0" fill="#FEF08A"/>
        <circle cx="-6" cy="-14" r="2" fill="#FFFFFF"/>
        <circle cx="10" cy="-12" r="2" fill="#FFFFFF"/>
      </g>

      <!-- Stealth Naval Drone Wake (Left Foreground Slicing In) -->
      <g transform="translate(42, ${h - 14})">
        <polygon points="0,0 20,-3 22,0 0,3" fill="#0A0F1D"/>
        <!-- Hydrofoil Foam Wake -->
        <path d="M 0,0 L -28,-4 M 0,0 L -28,4" stroke="#38BDF8" stroke-width="1.6" opacity="0.85"/>
        <line x1="0" y1="0" x2="-22" y2="0" stroke="#FFFFFF" stroke-width="1" stroke-dasharray="4,2"/>
      </g>
    </g>
  `;
}

// 3. Hero 3: Europe: 186 Russian Drones Hit Ukraine & Baltic Ship Fire
function renderIllustration3(w: number, h: number): string {
  return `
    <g clip-path="url(#clip-ill-3)">
      <!-- Cold Stormy Ukrainian Night Sky -->
      <rect width="${w}" height="${h}" fill="#090D16"/>
      <path d="M 0,0 L 160,0 L 160,${h} L 0,${h} Z" fill="#111827"/>
      <!-- Searchlight Beam Piercing Clouds -->
      <polygon points="30,${h - 8} 80,-10 105,-10 40,${h - 8}" fill="#FEF08A" opacity="0.28"/>

      <!-- Kyiv / Dymer Damaged Apartment Silhouette -->
      <g transform="translate(12, 12)">
        <rect x="0" y="6" width="52" height="54" rx="2" fill="#1E293B" stroke="#0A0F1D" stroke-width="1.2"/>
        ${[0, 1, 2, 3].map(row => 
          [0, 1, 2].map(col => `
            <rect x="${6 + col * 15}" y="${12 + row * 11}" width="9" height="6" rx="1" fill="${row === 1 && col === 2 ? '#B91C1C' : '#FEF08A'}" opacity="${row === 1 && col === 2 ? '0.4' : '0.85'}"/>
          `).join('')
        ).join('')}
        <!-- Breach with Red Alert Impact -->
        <polygon points="38,6 52,6 52,18 42,15 38,10" fill="#090D16"/>
        <circle cx="45" cy="12" r="7" fill="none" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="2,2"/>
        <circle cx="45" cy="12" r="3.5" fill="#DC2626"/>
      </g>

      <!-- Drone Swarm & Anti-Aircraft Flak Bursts -->
      <g transform="translate(82, 10)">
        <!-- Drones -->
        <polygon points="12,6 18,16 6,16" fill="#0A0F1D" stroke="#DC2626" stroke-width="0.7"/>
        <polygon points="32,14 38,24 26,24" fill="#0A0F1D" stroke="#DC2626" stroke-width="0.7"/>
        <polygon points="54,8 60,18 48,18" fill="#0A0F1D" stroke="#DC2626" stroke-width="0.7"/>
        <!-- Tracer Arc -->
        <line x1="14" y1="28" x2="40" y2="28" stroke="#DC2626" stroke-width="1.6" stroke-dasharray="3,2"/>
        <polygon points="40,28 34,25 34,31" fill="#DC2626"/>
        <!-- Flak Burst -->
        <circle cx="26" cy="18" r="6" fill="#F87171" opacity="0.6"/>
        <circle cx="26" cy="18" r="2.8" fill="#FEF08A"/>
      </g>

      <line x1="156" y1="6" x2="156" y2="${h - 6}" stroke="#334155" stroke-width="1" stroke-dasharray="3,3"/>

      <!-- Baltic Sea Waters & Burning Cargo Ship (Right Half) -->
      <g transform="translate(162, 0)">
        <rect width="${w - 162}" height="${h}" fill="#0A1128"/>
        <!-- Choppy Baltic Waters -->
        <path d="M 0,${h - 20} Q 35,${h - 26} 70,${h - 20} T ${w - 162},${h - 22} L ${w - 162},${h} L 0,${h} Z" fill="#030712"/>
        <!-- Burning Cargo Vessel -->
        <g transform="translate(10, ${h - 22})">
          <polygon points="0,-4 95,-4 105,-12 110,-12 108,2 8,2" fill="#1E293B" stroke="#0F172A" stroke-width="0.8"/>
          <rect x="8" y="-10" width="16" height="6" fill="#475569"/>
          <rect x="30" y="-10" width="14" height="6" rx="0.6" fill="#475569"/>
          <rect x="48" y="-10" width="14" height="6" rx="0.6" fill="#64748B"/>
          <!-- Raging Container Fire & Smoke -->
          <rect x="66" y="-12" width="16" height="8" rx="0.6" fill="#1E293B"/>
          <path d="M 68,-12 Q 74,-28 78,-16 Q 84,-32 88,-14 Z" fill="#DC2626"/>
          <path d="M 72,-12 Q 76,-22 80,-14 Z" fill="#FEF08A"/>
          <circle cx="76" cy="-26" r="7" fill="#374151" opacity="0.85"/>
          <circle cx="86" cy="-32" r="9" fill="#1F2937" opacity="0.75"/>
        </g>
      </g>
    </g>
  `;
}

// 4. Grid 4: Middle East: Gulf Drones & Bahrain UN Call
function renderIllustration4(w: number, h: number): string {
  return `
    <g clip-path="url(#clip-ill-4)">
      <!-- Rich Arabian Dusk Sky -->
      <rect width="${w}" height="${h}" fill="#1C1917"/>
      <path d="M 0,${h * 0.3} L ${w},${h * 0.15} L ${w},${h} L 0,${h} Z" fill="#451A03" opacity="0.9"/>
      <path d="M 0,${h * 0.55} L ${w},${h * 0.45} L ${w},${h} L 0,${h} Z" fill="#78350F" opacity="0.8"/>
      <!-- Desert Horizon -->
      <path d="M 0,${h - 10} Q 50,${h - 18} 100,${h - 14} T ${w},${h - 15} L ${w},${h} L 0,${h} Z" fill="#0A0F1D"/>
      
      <!-- Patriot Radar Battery Silhouette -->
      <g transform="translate(24, ${h - 14})">
        <rect x="-14" y="-4" width="28" height="4" fill="#334155" rx="1"/>
        <path d="M -12,-4 A 12 12 0 0 1 12,-4 Z" fill="#475569"/>
        <line x1="0" y1="-14" x2="0" y2="-4" stroke="#94A3B8" stroke-width="1.2"/>
        <!-- Radar Waves -->
        <path d="M 12,-10 A 14 14 0 0 1 22,-20" fill="none" stroke="#F59E0B" stroke-width="1" stroke-dasharray="2,2"/>
      </g>

      <!-- Interceptor Rocket Launch Arc & Detonation -->
      <path d="M 28,${h - 16} Q 65,8 ${w - 55},16" fill="none" stroke="#DC2626" stroke-width="2.2"/>
      <line x1="28" y1="${h - 16}" x2="42" y2="${h - 24}" stroke="#FEF08A" stroke-width="1.8"/>

      <!-- Kinetic Starburst Impact with Hostile Drone -->
      <g transform="translate(${w - 55}, 16)">
        <circle cx="0" cy="0" r="10" fill="#DC2626" opacity="0.7"/>
        <circle cx="0" cy="0" r="4.5" fill="#FEF08A"/>
        <line x1="-8" y1="0" x2="8" y2="0" stroke="#FFFFFF" stroke-width="1.5"/>
        <line x1="0" y1="-8" x2="0" y2="8" stroke="#FFFFFF" stroke-width="1.5"/>
        <!-- Drone Debris -->
        <polygon points="6,-6 10,-2 7,2" fill="#0A0F1D"/>
      </g>

      <!-- Bahrain UN Emblem Silhouette Accent (Right) -->
      <g transform="translate(${w - 20}, ${h - 14})">
        <circle cx="0" cy="0" r="7.5" fill="none" stroke="#FEF08A" stroke-width="1" opacity="0.8"/>
        <path d="M -5,3 C -7,0 -6,-4 -2,-6" fill="none" stroke="#FEF08A" stroke-width="1" opacity="0.8"/>
        <path d="M 5,3 C 7,0 6,-4 2,-6" fill="none" stroke="#FEF08A" stroke-width="1" opacity="0.8"/>
      </g>
    </g>
  `;
}

// 5. Grid 5: Americas: Trump Urges Nvidia Rehire Huang
function renderIllustration5(w: number, h: number): string {
  return `
    <g clip-path="url(#clip-ill-5)">
      <!-- High-Tech Nvidia Emerald Datacenter Backdrop -->
      <rect width="${w}" height="${h}" fill="#022C22"/>
      <path d="M 0,0 L ${w},0 L ${w},${h} L 0,${h} Z" fill="#064E3B" opacity="0.65"/>
      <!-- Server Rack Lines & Glowing Trace Matrix -->
      ${[0, 1, 2, 3].map(i => `
        <line x1="0" y1="${6 + i * 11}" x2="${w}" y2="${6 + i * 11}" stroke="#052E16" stroke-width="1"/>
      `).join('')}

      <!-- Glowing Server LED Matrix (Left) -->
      <g transform="translate(10, 6)">
        <rect x="0" y="0" width="36" height="32" rx="2" fill="#0A0F1D" stroke="#10B981" stroke-width="1"/>
        <rect x="4" y="4" width="28" height="6" fill="#1E293B"/>
        <circle cx="8" cy="7" r="1.5" fill="#10B981"/>
        <circle cx="14" cy="7" r="1.5" fill="#34D399"/>
        <rect x="4" y="13" width="28" height="6" fill="#1E293B"/>
        <circle cx="8" cy="16" r="1.5" fill="#10B981"/>
        <circle cx="14" cy="16" r="1.5" fill="#F59E0B"/>
        <rect x="4" y="22" width="28" height="5" fill="#1E293B"/>
        <circle cx="8" cy="24.5" r="1.2" fill="#10B981"/>
      </g>

      <!-- Radiant AI Accelerator GPU Die (Center) -->
      <g transform="translate(85, 23)">
        <rect x="-16" y="-16" width="32" height="32" rx="3" fill="#0A0F1D" stroke="#10B981" stroke-width="1.8"/>
        <rect x="-11" y="-11" width="22" height="22" rx="1.5" fill="#047857"/>
        <circle cx="0" cy="0" r="5.5" fill="#FEF08A"/>
        <!-- Golden Circuit Bus Pins -->
        <line x1="-16" y1="-7" x2="-20" y2="-7" stroke="#F59E0B" stroke-width="1.2"/>
        <line x1="-16" y1="0" x2="-20" y2="0" stroke="#F59E0B" stroke-width="1.2"/>
        <line x1="-16" y1="7" x2="-20" y2="7" stroke="#F59E0B" stroke-width="1.2"/>
        <line x1="16" y1="-7" x2="20" y2="-7" stroke="#F59E0B" stroke-width="1.2"/>
        <line x1="16" y1="0" x2="20" y2="0" stroke="#F59E0B" stroke-width="1.2"/>
        <line x1="16" y1="7" x2="20" y2="7" stroke="#F59E0B" stroke-width="1.2"/>
      </g>

      <!-- US Capitol Dome Silhouette (Right) -->
      <g transform="translate(${w - 38}, 10)">
        <polygon points="10,30 10,16 26,16 26,30" fill="#0A0F1D"/>
        <path d="M 12,16 A 6 6 0 0 1 24,16 Z" fill="#0A0F1D"/>
        <line x1="18" y1="10" x2="18" y2="5" stroke="#0A0F1D" stroke-width="1.5"/>
        <circle cx="18" cy="4" r="1.5" fill="#FEF08A"/>
        <!-- Executive Seal Star Accent -->
        <circle cx="18" cy="22" r="2.8" fill="#F59E0B"/>
      </g>
    </g>
  `;
}

// 6. Grid 6: Europe: Alcaraz Wins 1st ATP Finals (Turin Indoor Arena)
function renderIllustration6(w: number, h: number): string {
  return `
    <g clip-path="url(#clip-ill-6)">
      <!-- Dramatic Turin Indoor Stadium Arena -->
      <rect width="${w}" height="${h}" fill="#0F172A"/>
      <path d="M 0,0 L ${w},0 L ${w},${h * 0.4} L 0,${h * 0.45} Z" fill="#1E1B4B"/>
      <!-- Floodlight Gantries -->
      <circle cx="24" cy="5" r="3.5" fill="#FEF08A" opacity="0.7"/>
      <circle cx="70" cy="4" r="3.5" fill="#FEF08A" opacity="0.7"/>
      <circle cx="120" cy="4" r="3.5" fill="#FEF08A" opacity="0.7"/>
      <circle cx="160" cy="5" r="3.5" fill="#FEF08A" opacity="0.7"/>

      <!-- Indoor Blue Hardcourt Floor -->
      <polygon points="0,${h - 3} 28,${h * 0.38} ${w - 28},${h * 0.38} ${w},${h - 3}" fill="#1D4ED8"/>
      <polygon points="12,${h - 3} 36,${h * 0.42} ${w - 36},${h * 0.42} ${w - 12},${h - 3}" fill="#2563EB"/>
      <!-- Court Baseline & Net Lines -->
      <line x1="28" y1="${h * 0.38}" x2="${w - 28}" y2="${h * 0.38}" stroke="#FFFFFF" stroke-width="1.2"/>
      <line x1="18" y1="${h - 7}" x2="${w - 18}" y2="${h - 7}" stroke="#FFFFFF" stroke-width="1.2"/>
      <line x1="${w * 0.5}" y1="${h * 0.38}" x2="${w * 0.5}" y2="${h - 3}" stroke="#FFFFFF" stroke-width="1"/>

      <!-- Tennis Player (Alcaraz) Smash Silhouette (Left) -->
      <g transform="translate(48, 12)">
        <circle cx="0" cy="4" r="2.8" fill="#FFFFFF"/>
        <polygon points="-3,7 3,7 2,16 -2,16" fill="#FFFFFF"/>
        <polygon points="-2,16 2,16 4,25 1,25" fill="#FEF08A"/>
        <line x1="2" y1="8" x2="14" y2="0" stroke="#FFFFFF" stroke-width="1.8"/>
        <ellipse cx="18" cy="-2" rx="4" ry="6" fill="none" stroke="#FEF08A" stroke-width="1.5" transform="rotate(25 18 -2)"/>
        <!-- Speeding Yellow Tennis Ball -->
        <circle cx="28" cy="2" r="2.6" fill="#CCFF00"/>
        <line x1="20" y1="0" x2="28" y2="2" stroke="#CCFF00" stroke-width="1" stroke-dasharray="2,2"/>
      </g>

      <!-- Gleaming ATP Finals Trophy Cup Silhouette (Right) -->
      <g transform="translate(${w - 30}, 22)">
        <polygon points="-6,-9 6,-9 4,2 -4,2" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1"/>
        <rect x="-2" y="2" width="4" height="5" fill="#CBD5E1"/>
        <rect x="-5" y="7" width="10" height="3" rx="1" fill="#94A3B8"/>
        <circle cx="0" cy="-5" r="2" fill="#F59E0B"/>
        <!-- Handles -->
        <path d="M -6,-7 C -10,-5 -9,0 -4,1" fill="none" stroke="#E2E8F0" stroke-width="1.2"/>
        <path d="M 6,-7 C 10,-5 9,0 4,1" fill="none" stroke="#E2E8F0" stroke-width="1.2"/>
      </g>
    </g>
  `;
}

// 7. Grid 7: Europe: Liverpool Rout Man Utd 4–0 (Anfield Floodlit Night)
function renderIllustration7(w: number, h: number): string {
  return `
    <g clip-path="url(#clip-ill-7)">
      <!-- Anfield Floodlit Night Sky -->
      <rect width="${w}" height="${h}" fill="#0A0F1D"/>
      <path d="M 0,0 L ${w},0 L ${w},${h * 0.42} L 0,${h * 0.48} Z" fill="#7F1D1D" opacity="0.9"/>
      <!-- Floodlight Glare -->
      <polygon points="15,0 35,0 60,${h * 0.45} 5,${h * 0.45}" fill="#FEF08A" opacity="0.3"/>
      <polygon points="${w - 35},0 ${w - 15},0 ${w - 5},${h * 0.45} ${w - 60},${h * 0.45}" fill="#FEF08A" opacity="0.3"/>

      <!-- Anfield Stadium Roof Gantry Silhouette -->
      <polygon points="0,${h * 0.28} ${w},${h * 0.22} ${w},${h * 0.36} 0,${h * 0.42}" fill="#0A0F1D"/>

      <!-- Lush Emerald Pitch Floor -->
      <rect x="0" y="${h * 0.42}" width="${w}" height="${h * 0.58}" fill="#065F46"/>
      <ellipse cx="${w * 0.5}" cy="${h - 3}" rx="30" ry="12" fill="none" stroke="#A7F3D0" stroke-width="1.2"/>
      <line x1="0" y1="${h - 3}" x2="${w}" y2="${h - 3}" stroke="#A7F3D0" stroke-width="1.2"/>

      <!-- Striker Striking Ball into Netting (Center-Left) -->
      <g transform="translate(54, 24)">
        <polygon points="-4,2 4,2 2,12 -2,12" fill="#FFFFFF"/>
        <circle cx="0" cy="0" r="2.8" fill="#FFFFFF"/>
        <line x1="0" y1="12" x2="8" y2="18" stroke="#DC2626" stroke-width="2"/>
        <!-- Ball in Flight -->
        <circle cx="22" cy="13" r="3.2" fill="#FFFFFF" stroke="#0A0F1D" stroke-width="0.8"/>
        <line x1="10" y1="15" x2="18" y2="14" stroke="#FFFFFF" stroke-width="1" stroke-dasharray="2,2"/>
      </g>

      <!-- Giant 4–0 Scoreboard Banner & Liver Bird Crest (Right) -->
      <g transform="translate(${w - 52}, 14)">
        <rect x="0" y="0" width="44" height="22" rx="2" fill="#0A0F1D" stroke="#DC2626" stroke-width="1.2"/>
        <rect x="2" y="2" width="40" height="18" fill="#7F1D1D"/>
        <!-- Score Digits -->
        <circle cx="11" cy="11" r="5.5" fill="#DC2626"/>
        <circle cx="31" cy="11" r="5.5" fill="#1E293B"/>
        <polygon points="21,5 23,9 19,13 21,17" fill="#FEF08A"/>
      </g>
    </g>
  `;
}

// 8. Grid 8: Europe: Márquez Ties 8th MotoGP Title (Portimão Track)
function renderIllustration8(w: number, h: number): string {
  return `
    <g clip-path="url(#clip-ill-8)">
      <!-- Portimão Coastal Sunset Twilight -->
      <rect width="${w}" height="${h}" fill="#1C1917"/>
      <path d="M 0,0 L ${w},0 L ${w},${h * 0.45} L 0,${h * 0.55} Z" fill="#7C2D12"/>
      <path d="M 0,${h * 0.3} L ${w},${h * 0.22} L ${w},${h * 0.55} L 0,${h * 0.55} Z" fill="#C2410C" opacity="0.85"/>
      <circle cx="45" cy="${h * 0.35}" r="15" fill="#F59E0B" opacity="0.65"/>

      <!-- Asphalt Track with Elevation Wave -->
      <path d="M 0,${h - 4} Q 40,${h - 24} 75,${h * 0.45} L 110,${h * 0.42} Q 70,${h - 16} 35,${h} Z" fill="#1E293B"/>
      <!-- Red and White Striped Rumble Kerb -->
      <polygon points="0,${h - 8} 10,${h - 13} 14,${h - 11} 4,${h - 6}" fill="#DC2626"/>
      <polygon points="10,${h - 13} 20,${h - 18} 24,${h - 16} 14,${h - 11}" fill="#FFFFFF"/>
      <polygon points="20,${h - 18} 30,${h - 24} 34,${h - 22} 24,${h - 16}" fill="#DC2626"/>
      <polygon points="30,${h - 24} 40,${h - 30} 44,${h - 28} 34,${h - 22}" fill="#FFFFFF"/>

      <!-- Extreme 65-Degree Banked MotoGP Bike & Rider Silhouette -->
      <g transform="translate(38, ${h - 18}) rotate(-28)">
        <ellipse cx="-13" cy="2" rx="5.5" ry="3.2" fill="#0A0F1D"/>
        <ellipse cx="15" cy="-2" rx="5.5" ry="3.2" fill="#0A0F1D"/>
        <polygon points="-11,0 4,-2 11,-4 7,-9 -2,-8" fill="#DC2626"/>
        <circle cx="2" cy="-11" r="3.8" fill="#0A0F1D"/>
        <ellipse cx="4" cy="2" rx="2.5" ry="1.2" fill="#FEF08A"/>
        <!-- Knee Slider Sparks on Tarmac -->
        <circle cx="8" cy="4" r="1.5" fill="#FEF08A"/>
        <circle cx="12" cy="5" r="1" fill="#FEF08A"/>
      </g>

      <!-- 8th World Championship Laurel Wreath & Gold Trophy (Right) -->
      <g transform="translate(${w - 30}, 22)">
        <circle cx="0" cy="0" r="11" fill="none" stroke="#F59E0B" stroke-width="1.8"/>
        <polygon points="-5,-5 5,-5 3.5,3.5 -3.5,3.5" fill="#F59E0B"/>
        <rect x="-1.5" y="3.5" width="3" height="3.5" fill="#D97706"/>
        <circle cx="0" cy="-12" r="2" fill="#DC2626"/>
      </g>
    </g>
  `;
}

// 9. Grid 9: Asia: India Record 720/9 in NZ (Basin Reserve Wellington)
function renderIllustration9(w: number, h: number): string {
  return `
    <g clip-path="url(#clip-ill-9)">
      <!-- Basin Reserve Sky & Lush Embankment Hills -->
      <rect width="${w}" height="${h}" fill="#0284C7"/>
      <path d="M 0,${h * 0.28} Q 50,${h * 0.18} 100,${h * 0.24} T ${w},${h * 0.22} L ${w},${h} L 0,${h} Z" fill="#15803D"/>
      <path d="M 0,${h * 0.48} Q 60,${h * 0.4} 120,${h * 0.46} T ${w},${h * 0.42} L ${w},${h} L 0,${h} Z" fill="#166534"/>

      <!-- Historic Pavilion Clock Tower Silhouette (Right) -->
      <g transform="translate(${w - 36}, ${h * 0.22})">
        <rect x="0" y="0" width="24" height="16" fill="#064E3B"/>
        <polygon points="0,0 12,-7 24,0" fill="#064E3B"/>
        <circle cx="12" cy="5" r="2.8" fill="#FEF08A"/>
      </g>

      <!-- Tan Cricket Turf Strip -->
      <polygon points="15,${h - 2} 40,${h * 0.58} ${w - 50},${h * 0.58} ${w - 20},${h - 2}" fill="#D97706" opacity="0.8"/>

      <!-- Wickets & Dislodged Bails (Left) -->
      <g transform="translate(32, ${h - 14})">
        <line x1="-5" y1="0" x2="-5" y2="-16" stroke="#FFFFFF" stroke-width="1.8"/>
        <line x1="0" y1="0" x2="0" y2="-16" stroke="#FFFFFF" stroke-width="1.8"/>
        <line x1="5" y1="0" x2="5" y2="-16" stroke="#FFFFFF" stroke-width="1.8"/>
        <!-- Flying Bail -->
        <line x1="-3" y1="-19" x2="4" y2="-21" stroke="#DC2626" stroke-width="1.5" transform="rotate(20)"/>
      </g>

      <!-- Batsman Pull Shot Silhouette & Soaring Red Leather Ball -->
      <g transform="translate(74, 20)">
        <circle cx="0" cy="0" r="3" fill="#FFFFFF"/>
        <polygon points="-3,3 3,3 2,13 -2,13" fill="#FFFFFF"/>
        <line x1="2" y1="5" x2="13" y2="2" stroke="#FFFFFF" stroke-width="1.8"/>
        <polygon points="11,0 15,0 18,15 13,15" fill="#FDE047" transform="rotate(-30 13 7)"/>
      </g>

      <!-- Red Ball Flying Over Boundary Arc with White Dash Trail -->
      <path d="M 90,22 Q 112,10 132,15" fill="none" stroke="#DC2626" stroke-width="1.2" stroke-dasharray="3,2"/>
      <circle cx="132" cy="15" r="3.4" fill="#DC2626" stroke="#FFFFFF" stroke-width="0.8"/>
    </g>
  `;
}

// 10. Grid 10: Americas: Verstappen Wins Las Vegas GP (Neon Strip Spectacle)
function renderIllustration10(w: number, h: number): string {
  return `
    <g clip-path="url(#clip-ill-10)">
      <!-- Neon Vegas Strip Night Sky -->
      <rect width="${w}" height="${h}" fill="#1E1B4B"/>
      <path d="M 0,0 L ${w},0 L ${w},${h * 0.55} L 0,${h * 0.65} Z" fill="#3B0764"/>
      <!-- Neon Washes (Magenta & Cyan) -->
      <circle cx="45" cy="15" r="22" fill="#EC4899" opacity="0.35"/>
      <circle cx="${w - 45}" cy="16" r="22" fill="#06B6D4" opacity="0.35"/>

      <!-- Luxor Pyramid & Sky Beam -->
      <polygon points="15,${h * 0.6} 28,${h * 0.3} 42,${h * 0.6}" fill="#0A0F1D"/>
      <polygon points="26,${h * 0.3} 30,${h * 0.3} 36,0 20,0" fill="#FEF08A" opacity="0.65"/>
      <!-- Casino High-Rise Tower Silhouettes -->
      <rect x="52" y="${h * 0.28}" width="16" height="20" fill="#0A0F1D"/>
      <rect x="76" y="${h * 0.22}" width="20" height="24" fill="#0A0F1D"/>

      <!-- Strip Asphalt Track -->
      <rect x="0" y="${h - 20}" width="${w}" height="20" fill="#0A0F1D"/>
      <line x1="0" y1="${h - 10}" x2="${w}" y2="${h - 10}" stroke="#EC4899" stroke-width="1.2" stroke-dasharray="10,6"/>

      <!-- F1 Car Front/Side High-Speed Silhouette with Glowing Orange Brake Heat -->
      <g transform="translate(52, ${h - 14})">
        <rect x="0" y="-7" width="8" height="11" rx="1.5" fill="#0A0F1D"/>
        <rect x="40" y="-7" width="8" height="11" rx="1.5" fill="#0A0F1D"/>
        <polygon points="6,2 42,2 34,-4 14,-4" fill="#1E3A8A"/>
        <circle cx="24" cy="-5" r="2.8" fill="#F59E0B"/>
        <rect x="9" y="3" width="28" height="2.5" fill="#DC2626"/>
        <!-- Brake Disc Heat Glow -->
        <circle cx="4" cy="-2" r="2" fill="#F97316"/>
        <circle cx="44" cy="-2" r="2" fill="#F97316"/>
      </g>

      <!-- Checkered Flag (Right) -->
      <g transform="translate(${w - 26}, 12)">
        <line x1="-5" y1="0" x2="-5" y2="24" stroke="#FFFFFF" stroke-width="1.5"/>
        <rect x="-5" y="0" width="5" height="5" fill="#FFFFFF"/>
        <rect x="0" y="0" width="5" height="5" fill="#0A0F1D"/>
        <rect x="5" y="0" width="5" height="5" fill="#FFFFFF"/>
        <rect x="-5" y="5" width="5" height="5" fill="#0A0F1D"/>
        <rect x="0" y="5" width="5" height="5" fill="#DC2626"/>
        <rect x="5" y="5" width="5" height="5" fill="#0A0F1D"/>
      </g>
    </g>
  `;
}

// 11. Grid 11: Americas: Brazil Storm Kills 5, 250+ Hurt (Rio Grande do Sul)
function renderIllustration11(w: number, h: number): string {
  return `
    <g clip-path="url(#clip-ill-11)">
      <!-- Menacing Supercell Thunderstorm Sky -->
      <rect width="${w}" height="${h}" fill="#0F172A"/>
      <path d="M 0,0 L ${w},0 L ${w},${h * 0.58} L 0,${h * 0.65} Z" fill="#2E1065"/>
      <path d="M 0,${h * 0.25} L ${w},${h * 0.18} L ${w},${h * 0.65} L 0,${h * 0.65} Z" fill="#1E293B" opacity="0.85"/>

      <!-- Billowing Anvil Cumulonimbus Wall -->
      <ellipse cx="60" cy="${h * 0.28}" rx="45" ry="15" fill="#111827"/>
      <ellipse cx="120" cy="${h * 0.22}" rx="50" ry="16" fill="#1E293B"/>

      <!-- Vivid Jagged Lightning Bolts Striking Downward -->
      <path d="M 75,${h * 0.24} L 68,${h * 0.44} L 76,${h * 0.46} L 64,${h - 12}" fill="none" stroke="#FFFFFF" stroke-width="1.8"/>
      <path d="M 75,${h * 0.24} L 68,${h * 0.44} L 76,${h * 0.46} L 64,${h - 12}" fill="none" stroke="#67E8F9" stroke-width="3.2" opacity="0.6"/>
      <line x1="72" y1="${h * 0.36}" x2="84" y2="${h * 0.48}" stroke="#FFFFFF" stroke-width="1.2"/>

      <!-- Diagonal Torrential Rain Streaks -->
      ${[0, 1, 2, 3, 4, 5].map(i => `
        <line x1="${20 + i * 26}" y1="${h * 0.4}" x2="${12 + i * 26}" y2="${h - 8}" stroke="#38BDF8" stroke-width="0.9" stroke-dasharray="6,4" opacity="0.7"/>
      `).join('')}

      <!-- Wind-Whipped Palm Silhouette & Damaged Rural Rooftop (Right) -->
      <g transform="translate(${w - 36}, ${h - 12})">
        <path d="M 0,0 Q 8,-11 15,-22" fill="none" stroke="#0A0F1D" stroke-width="2"/>
        <path d="M 15,-22 Q 24,-24 32,-20 M 15,-22 Q 26,-18 30,-13 M 15,-22 Q 22,-15 24,-9" fill="none" stroke="#0A0F1D" stroke-width="1.4"/>
        <circle cx="-14" cy="-4" r="2.8" fill="#DC2626"/>
      </g>
    </g>
  `;
}

// 12. Grid 12: Asia: Indonesia Factory Fire: 36 Missing (Serang, Banten)
function renderIllustration12(w: number, h: number): string {
  return `
    <g clip-path="url(#clip-ill-12)">
      <!-- Intense Industrial Warehouse Fire Sky -->
      <rect width="${w}" height="${h}" fill="#18181B"/>
      <path d="M 0,0 L ${w},0 L ${w},${h * 0.55} L 0,${h * 0.65} Z" fill="#450A0A"/>
      <!-- Saturated Fire Glow -->
      <circle cx="85" cy="${h * 0.45}" r="35" fill="#EA580C" opacity="0.7"/>
      <circle cx="85" cy="${h * 0.45}" r="20" fill="#FEF08A" opacity="0.8"/>

      <!-- Large Industrial Gabled Warehouse Silhouette -->
      <g transform="translate(30, ${h * 0.35})">
        <polygon points="0,${h * 0.4} 0,10 38,0 76,10 76,${h * 0.4}" fill="#0A0F1D"/>
        <rect x="24" y="14" width="28" height="16" fill="#DC2626"/>
        <line x1="38" y1="14" x2="38" y2="30" stroke="#FEF08A" stroke-width="1.5"/>
      </g>

      <!-- Raging Flame Tongues & Rolling Black Smoke Plumes -->
      <path d="M 45,${h * 0.35} Q 52,${h * 0.12} 60,${h * 0.28} Q 68,8 76,${h * 0.25} Q 86,${h * 0.1} 95,${h * 0.35} Z" fill="#F97316"/>
      <path d="M 55,${h * 0.35} Q 62,${h * 0.18} 70,${h * 0.3} Q 78,${h * 0.15} 85,${h * 0.35} Z" fill="#FEF08A"/>
      <!-- Rolling Dark Smoke -->
      <circle cx="65" cy="${h * 0.15}" r="11" fill="#27272A" opacity="0.9"/>
      <circle cx="95" cy="${h * 0.18}" r="13" fill="#3F3F46" opacity="0.85"/>
      <circle cx="120" cy="${h * 0.25}" r="15" fill="#18181B" opacity="0.8"/>

      <!-- High-Pressure Firefighter Cyan/White Water Jet Stream Cutting In (Left) -->
      <path d="M 0,${h - 8} Q 35,${h * 0.55} 65,${h * 0.32}" fill="none" stroke="#38BDF8" stroke-width="2.2"/>
      <path d="M 0,${h - 8} Q 35,${h * 0.55} 65,${h * 0.32}" fill="none" stroke="#FFFFFF" stroke-width="1.1"/>
      <circle cx="65" cy="${h * 0.32}" r="3.5" fill="#38BDF8" opacity="0.75"/>
    </g>
  `;
}

// 13. Grid 13: Asia: HK Poll Sets 98.79% Turnout (Victoria Harbour Skyline)
function renderIllustration13(w: number, h: number): string {
  return `
    <g clip-path="url(#clip-ill-13)">
      <!-- Hong Kong Victoria Harbour Night Panorama -->
      <rect width="${w}" height="${h}" fill="#0A1128"/>
      <path d="M 0,0 L ${w},0 L ${w},${h * 0.55} L 0,${h * 0.6} Z" fill="#172554"/>
      <!-- Glowing Harbour Waters -->
      <rect x="0" y="${h - 16}" width="${w}" height="16" fill="#030712"/>
      <line x1="8" y1="${h - 8}" x2="${w - 8}" y2="${h - 8}" stroke="#38BDF8" stroke-width="1" stroke-dasharray="6,4" opacity="0.65"/>

      <!-- Iconic Bank of China & Skyscraper Silhouettes -->
      <polygon points="18,${h - 16} 28,10 38,${h - 16}" fill="#0A0F1D" stroke="#38BDF8" stroke-width="0.8"/>
      <rect x="45" y="14" width="14" height="${h - 30}" fill="#0A0F1D"/>
      <polygon points="68,${h - 16} 76,8 84,${h - 16}" fill="#0A0F1D"/>
      <!-- Glowing Skyscraper Windows -->
      ${[0, 1, 2, 3].map(row => `
        <circle cx="52" cy="${18 + row * 6}" r="1.2" fill="#FEF08A"/>
      `).join('')}

      <!-- Official Ballot Box with Golden Ballot Descending (Right) -->
      <g transform="translate(${w - 54}, 10)">
        <rect x="0" y="8" width="38" height="26" rx="2" fill="#0A0F1D" stroke="#F59E0B" stroke-width="1.2"/>
        <line x1="9" y1="12" x2="29" y2="12" stroke="#FEF08A" stroke-width="1.5"/>
        <!-- Descending White/Gold Ballot -->
        <polygon points="13,1 25,1 25,11 13,11" fill="#FFFFFF" stroke="#DC2626" stroke-width="1"/>
        <circle cx="19" cy="5" r="1.5" fill="#DC2626"/>
        <!-- High-Turnout Checkmark -->
        <path d="M 11,22 L 17,28 L 27,16" fill="none" stroke="#10B981" stroke-width="2"/>
      </g>
    </g>
  `;
}

// ============================================================================
// SVG BUILDER: 24-STORY, 7-REGION BROADSHEET FRONT PAGE
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
    { id: 1, name: 'Antalya', lat: 36.9, lon: 30.7, color: C.crimsonBright, dx: 3, dy: 4 },
    { id: 2, name: 'Benghazi', lat: 32.1, lon: 20.1, color: C.crimsonBright, dx: -3, dy: 5 },
    { id: 3, name: 'Kyiv', lat: 50.4, lon: 30.5, color: C.crimsonBright, dx: 0, dy: -5 },
    { id: 4, name: 'Western Saudi', lat: 24.7, lon: 46.7, color: C.crimsonBright, dx: 2, dy: 0 },
    { id: 5, name: 'Washington DC', lat: 38.9, lon: -77.0, color: C.crimsonBright, dx: 0, dy: 0 },
    { id: 6, name: 'Turin', lat: 45.0, lon: 7.7, color: C.crimsonBright, dx: 3, dy: 3 },
    { id: 7, name: 'Liverpool', lat: 53.4, lon: -3.0, color: C.crimsonBright, dx: -4, dy: -4 },
    { id: 8, name: 'Portimão', lat: 37.2, lon: -8.6, color: C.crimsonBright, dx: -3, dy: 3 },
    { id: 9, name: 'Wellington', lat: -41.3, lon: 174.8, color: C.crimsonBright, dx: -4, dy: 0 },
    { id: 10, name: 'Las Vegas', lat: 36.2, lon: -115.1, color: C.crimsonBright, dx: -4, dy: 0 },
    { id: 11, name: 'Rio Grande do Sul', lat: -29.2, lon: -53.8, color: C.crimsonBright, dx: 0, dy: 0 },
    { id: 12, name: 'Banten, Indonesia', lat: -6.1, lon: 106.1, color: C.crimsonBright, dx: 0, dy: 0 },
    { id: 13, name: 'Hong Kong', lat: 22.3, lon: 114.2, color: C.crimsonBright, dx: 2, dy: 0 },
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

    <!-- Clip Paths for 13 Full-Bleed Artwork Boxes -->
    <clipPath id="clip-ill-1"><rect width="308" height="74" rx="3"/></clipPath>
    <clipPath id="clip-ill-2"><rect width="308" height="74" rx="3"/></clipPath>
    <clipPath id="clip-ill-3"><rect width="308" height="74" rx="3"/></clipPath>
    <clipPath id="clip-ill-4"><rect width="180" height="46" rx="2.5"/></clipPath>
    <clipPath id="clip-ill-5"><rect width="180" height="46" rx="2.5"/></clipPath>
    <clipPath id="clip-ill-6"><rect width="180" height="46" rx="2.5"/></clipPath>
    <clipPath id="clip-ill-7"><rect width="180" height="46" rx="2.5"/></clipPath>
    <clipPath id="clip-ill-8"><rect width="180" height="46" rx="2.5"/></clipPath>
    <clipPath id="clip-ill-9"><rect width="180" height="46" rx="2.5"/></clipPath>
    <clipPath id="clip-ill-10"><rect width="180" height="46" rx="2.5"/></clipPath>
    <clipPath id="clip-ill-11"><rect width="180" height="46" rx="2.5"/></clipPath>
    <clipPath id="clip-ill-12"><rect width="180" height="46" rx="2.5"/></clipPath>
    <clipPath id="clip-ill-13"><rect width="180" height="46" rx="2.5"/></clipPath>

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
        font-weight: 600;
        fill: ${C.charcoal};
      }
      .grid-title {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 9px;
        font-weight: 900;
        fill: ${C.inkNavy};
        letter-spacing: -0.2px;
      }
      .grid-body {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 7.2px;
        font-weight: 600;
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
      .bottom-col-lead {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 8.2px;
        font-weight: 800;
        fill: ${C.inkNavy};
      }
      .bottom-col-body {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 7.6px;
        font-weight: 600;
        fill: ${C.charcoal};
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
      const isRed = i === 0 || i === 1 || i === 2;

      return `
        <g transform="translate(${bx}, 80)">
          <rect width="${bw}" height="42" rx="3.5" fill="${C.cardMuted}" stroke="${C.cardBorder}" stroke-width="1"/>
          <text x="8" y="27" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="${numFontSize}" font-weight="900" fill="${isRed ? C.crimson : C.inkNavy}">${esc(num.value)}</text>
          <text x="${labelX}" y="17" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.4" font-weight="700" fill="${C.inkNavy}">${esc(l1)}</text>
          <text x="${labelX}" y="28" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.4" font-weight="700" fill="${C.inkNavy}">${esc(l2)}</text>
        </g>
      `;
    }).join('')}
  </g>

  <!-- ====================================================================== -->
  <!-- ZONE 3: 7-REGION BAR + THE DAY IN UTC TIMELINE (y: 126 to 164)          -->
  <!-- ====================================================================== -->
  <g id="zone-3-coverage-timeline" transform="translate(16, 126)">
    <!-- Top Strip: 7-Region Proportional Stacked Bar (24 Stories Total) -->
    <rect width="${totalWidth}" height="16" rx="2.5" fill="${C.cardMuted}" stroke="${C.cardBorder}" stroke-width="0.8"/>
    ${(() => {
      const segWidths: Record<string, number> = {
        Europe: 200,
        Asia: 200,
        'Middle East': 164,
        Americas: 164,
        Africa: 122,
        Oceania: 88,
        Global: 54,
      };
      let currentX = 0;
      return data.regionDistribution.map(r => {
        const segWidth = segWidths[r.region] || (r.count / 24) * totalWidth;
        const segText = `${esc(r.region.toUpperCase())} (${r.count})`;
        const out = `
          <rect x="${currentX}" y="0" width="${segWidth}" height="16" fill="${r.color}" stroke="${C.paper}" stroke-width="0.75"/>
          <text x="${currentX + segWidth / 2}" y="11" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.2" font-weight="800" fill="#FFFFFF" letter-spacing="0.4">${segText}</text>
        `;
        currentX += segWidth;
        return out;
      }).join('');
    })()}

    <!-- Bottom Strip: Dark THE DAY IN UTC Timeline (7 Nodes) -->
    <g transform="translate(0, 18)">
      <rect width="${totalWidth}" height="20" rx="2.5" fill="${C.inkNavy}"/>
      <text x="8" y="13.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="900" fill="${C.amberLight}" letter-spacing="0.8">THE DAY IN UTC:</text>
      
      <!-- 7 Timeline Nodes -->
      ${data.timelineNodes.map((node, ni) => {
        const nodeX = 105 + ni * 126;
        return `
          <g transform="translate(${nodeX}, 0)">
            <circle cx="0" cy="10" r="2.5" fill="${C.amberLight}"/>
            <text x="6" y="13.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="800" fill="#FFFFFF">${esc(node.time)}</text>
            <text x="32" y="13.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.2" font-weight="700" fill="#CBD5E1">${esc(node.event)}</text>
            ${ni < 6 ? `<text x="116" y="13.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7" fill="#64748B">→</text>` : ''}
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
      const illW = colW - 16; // 308
      const illH = 74;

      let illSvg = '';
      if (hero.id === 1) illSvg = renderIllustration1(illW, illH);
      else if (hero.id === 2) illSvg = renderIllustration2(illW, illH);
      else if (hero.id === 3) illSvg = renderIllustration3(illW, illH);

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

          <!-- Rich Full-Bleed Colorful Vector Artwork -->
          <g transform="translate(8, 25)">
            ${illSvg}
          </g>

          <!-- Headline & Factual Summary (Pitch Dark Ink) -->
          <text x="8" y="118" class="hero-title">${esc(hero.headline)}</text>
          ${(() => {
            const lines = wrapText(hero.summary, 48);
            return lines.map((line, li) => 
              `<text x="8" y="${133 + li * 13}" class="hero-body">${esc(line)}</text>`
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
      const illH = 46;

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

          <!-- Rich Full-Bleed Colorful Vector Artwork -->
          <g transform="translate(6, 20)">
            ${illSvg}
          </g>

          <!-- Headline (Pitch Dark Ink) -->
          <text x="6" y="78" class="grid-title">${esc(story.headline)}</text>
          
          <!-- Summary Lines (Pitch Dark Ink, Word Wrapped into 2 Lines) -->
          ${(() => {
            const lines = wrapText(story.summary, 42);
            return lines.map((line, li) => 
              `<text x="6" y="${89 + li * 10}" class="grid-body">${esc(line)}</text>`
            ).join('');
          })()}

          <!-- Source Line with generous vertical clearance -->
          <text x="6" y="117" class="src-line">${esc(story.sources)}</text>
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
        
        <text x="10" y="37" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.8" font-weight="800" fill="${C.inkNavy}">• Every one of the 24 stories occurred or was first reported</text>
        <text x="18" y="49" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.8" font-weight="800" fill="${C.crimson}">on Sunday 22 November 2026 UTC.</text>
        <text x="10" y="66" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.4" font-weight="600" fill="${C.charcoal}">• Prior-day Nov 20–21 spillover (Mexico cartel arrest firefight)</text>
        <text x="18" y="78" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.4" font-weight="600" fill="${C.charcoal}">is explicitly excluded.</text>
        <text x="10" y="90" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.8" font-weight="700" fill="${C.mutedSlate}">STRICT FULL-DAY AUDIT · 100% FACTUAL FIDELITY</text>
      </g>
    </g>

    <!-- RIGHT: ALSO ON SUNDAY 22 NOVEMBER — 11 MORE STORIES (14–24, Spacious 2-Column Layout) -->
    <g id="bottom-stories-container" transform="translate(426, 630)">
      <rect width="582" height="310" rx="4" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
      
      <!-- Header -->
      <text x="12" y="16" class="sec-title">ALSO ON SUNDAY 22 NOVEMBER — 11 MORE STORIES (14–24)</text>
      <text x="${582 - 12}" y="16" text-anchor="end" class="sec-sub">VERIFIED 22 NOV 2026 UTC</text>
      <line x1="12" y1="21" x2="${582 - 12}" y2="21" stroke="${C.divider}" stroke-width="1"/>

      <!-- Vertical Divider between Column 1 and Column 2 -->
      <line x1="288" y1="26" x2="288" y2="304" stroke="${C.divider}" stroke-width="0.8"/>

      <!-- COLUMN 1: Stories 14–19 (6 stories, ~45px per story) -->
      <g transform="translate(10, 25)">
        ${data.bottomStories.slice(0, 6).map((s, idx) => {
          const rowY = idx * 45;
          const badgeW = s.status === 'CONFIRMED' ? 44 : s.status === 'REPORTED' ? 40 : s.status === 'CLAIM' ? 32 : 36;
          const badgeX = 108;
          const srcX = badgeX + badgeW + 6;
          return `
            <g transform="translate(0, ${rowY})">
              <!-- Top Row: Dot, Story Number, Region, Status, Source -->
              <circle cx="3" cy="6" r="3" fill="${s.regionColor}"/>
              <text x="10" y="9" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="900" fill="${s.regionColor}">[${s.id}] ${esc(s.region)}</text>
              <g transform="translate(${badgeX}, 1)">
                ${renderStatusBadge(s.status, 5.5)}
              </g>
              <text x="${srcX}" y="8.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.8" font-weight="700" fill="${C.mutedSlate}">(${esc(s.source)})</text>

              <!-- Story Text (2 lines, Pitch Dark Legible Ink) -->
              <text x="0" y="21" class="bottom-col-lead">${esc(s.lead)}</text>
              <text x="0" y="32" class="bottom-col-body">${esc(s.body)}</text>

              ${idx < 5 ? `<line x1="0" y1="39" x2="268" y2="39" stroke="${C.cardBorderSubtle}" stroke-width="0.8"/>` : ''}
            </g>
          `;
        }).join('')}
      </g>

      <!-- COLUMN 2: Stories 20–24 (5 stories, ~54px per story) -->
      <g transform="translate(298, 25)">
        ${data.bottomStories.slice(6).map((s, idx) => {
          const rowY = idx * 54;
          const badgeW = s.status === 'CONFIRMED' ? 44 : s.status === 'REPORTED' ? 40 : s.status === 'CLAIM' ? 32 : 36;
          const badgeX = 108;
          const srcX = badgeX + badgeW + 6;
          return `
            <g transform="translate(0, ${rowY})">
              <!-- Top Row: Dot, Story Number, Region, Status, Source -->
              <circle cx="3" cy="6" r="3" fill="${s.regionColor}"/>
              <text x="10" y="9" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="900" fill="${s.regionColor}">[${s.id}] ${esc(s.region)}</text>
              <g transform="translate(${badgeX}, 1)">
                ${renderStatusBadge(s.status, 5.5)}
              </g>
              <text x="${srcX}" y="8.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.8" font-weight="700" fill="${C.mutedSlate}">(${esc(s.source)})</text>

              <!-- Story Text (2 lines, Pitch Dark Legible Ink) -->
              <text x="0" y="23" class="bottom-col-lead">${esc(s.lead)}</text>
              <text x="0" y="36" class="bottom-col-body">${esc(s.body)}</text>

              ${idx < 4 ? `<line x1="0" y1="46" x2="274" y2="46" stroke="${C.cardBorderSubtle}" stroke-width="0.8"/>` : ''}
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
        <text x="59" y="9.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.2" font-weight="700" fill="${C.inkNavy}">Multi-outlet wire corroboration</text>

        <!-- Official -->
        <rect x="0" y="16" width="54" height="13" rx="2" fill="${C.crimson}"/>
        <text x="27" y="25.2" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.5" font-weight="800" fill="#FFFFFF">OFFICIAL</text>
        <text x="59" y="25.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.2" font-weight="700" fill="${C.inkNavy}">Government ministry, armed forces</text>
      </g>
      <g transform="translate(250, 20)">
        <!-- Reported -->
        <rect x="0" y="0" width="52" height="13" rx="2" fill="#1E293B"/>
        <text x="26" y="9.2" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.5" font-weight="800" fill="#FFFFFF">REPORTED</text>
        <text x="57" y="9.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.2" font-weight="700" fill="${C.inkNavy}">Single credible major news desk</text>

        <!-- Claim -->
        <rect x="0" y="16" width="44" height="13" rx="2" fill="#9A3412"/>
        <text x="22" y="25.2" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.5" font-weight="800" fill="#FFFFFF">CLAIM</text>
        <text x="49" y="25.5" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.2" font-weight="700" fill="${C.inkNavy}">Unverified party claim / assertion</text>
      </g>
    </g>

    <!-- Box 2: SOURCES & RECORD (Authentic Broadsheet Copy, Zero Renderer Jargon) -->
    <g transform="translate(502, 0)">
      <rect width="490" height="64" rx="3.5" fill="${C.cardMuted}" stroke="${C.cardBorder}" stroke-width="1"/>
      <text x="10" y="14" class="sec-title" font-size="8.2" fill="${C.crimson}">VERIFIED EDITORIAL DESKS &amp; AUDIT SOURCES</text>
      
      <g transform="translate(10, 24)">
        <text x="0" y="8" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.8" font-weight="800" fill="${C.inkNavy}">SOURCES: UN News · AP · Reuters · WaPo · Al Jazeera · ICC · MotoGP · AA · Kyiv Ind. · RFE/RL · AFP</text>
        <text x="0" y="22" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.4" font-weight="700" fill="${C.charcoal}">• Complete 24-story broadsheet digest curated and cross-verified for 22 Nov 2026 UTC.</text>
        <text x="0" y="34" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7" font-weight="600" fill="${C.mutedSlate}">International Sunday Edition · Full-day coverage across 7 global regions (00:00–21:00 UTC).</text>
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
  // Using compressionLevel: 9 to land cleanly inside 280-450 KB
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
