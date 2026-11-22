import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

interface Story {
  id: string;
  position: string;
  label: string;
  status: 'CONFIRMED' | 'OFFICIAL' | 'REPORTED';
  headline: string;
  subtitle: string;
  sources: string;
  illustration: string;
}

interface NewsData {
  date: string;
  displayDate: string;
  fullDateString: string;
  stories: Story[];
}

function loadStories(): NewsData {
  const dataPath = resolve(rootDir, 'data', 'stories.json');
  const raw = readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw) as NewsData;
}

// Color Palette - Swiss Editorial
const C = {
  paper: '#F6F3EC',
  cardBg: '#EFECE4',
  cardBorder: '#D8D3C5',
  cardBorderLight: '#E6E1D4',
  inkNavy: '#0F172A',
  charcoal: '#334155',
  mutedSlate: '#64748B',
  divider: '#1E293B',
  dividerSubtle: '#CBD5E1',
  crimson: '#C81E1E',
  crimsonDark: '#991B1B',
  crimsonLight: '#FECACA',
  steelDark: '#2C4A5A',
  steelMid: '#648595',
  steelLight: '#9BB3BF',
  steelBg: '#E2E9ED',
  greenBg: '#1B4332',
  greenText: '#E6F4EA',
  goldAmber: '#D97706',
};

function renderCategoryPill(x: number, y: number, label: string, status: 'CONFIRMED' | 'OFFICIAL' | 'REPORTED'): string {
  const statusColors = {
    CONFIRMED: { bg: C.greenBg, text: '#FFFFFF' },
    OFFICIAL: { bg: C.crimson, text: '#FFFFFF' },
    REPORTED: { bg: C.charcoal, text: '#FFFFFF' },
  };

  const sc = statusColors[status] || statusColors.REPORTED;
  
  const labelWidths: Record<string, number> = {
    'CLIMATE • TURKEY': 114,
    'MIDDLE EAST': 80,
    'TECH • US-CHINA': 110,
    'EUROPE • NATO': 96,
    'AFRICA • NIGERIA': 108,
  };
  const lw = labelWidths[label] || (label.length * 7);
  const pillWidth = status === 'CONFIRMED' ? 76 : status === 'REPORTED' ? 66 : 56;
  const pillX = lw + 14;

  return `
    <g transform="translate(${x}, ${y})">
      <text x="0" y="11" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="10" font-weight="800" fill="${C.inkNavy}" letter-spacing="1.2">${label}</text>
      <circle cx="${lw + 6}" cy="7.5" r="1.8" fill="${C.mutedSlate}"/>
      <rect x="${pillX}" y="0" width="${pillWidth}" height="15" rx="3" fill="${sc.bg}"/>
      <text x="${pillX + pillWidth / 2}" y="11" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="800" fill="${sc.text}" letter-spacing="0.8">${status}</text>
    </g>
  `;
}

// ============================================================================
// 1. CLIMATE / TURKEY — Modern Summit Pavilion & Stylized Globe
// ============================================================================
function renderClimateIllustration(x: number, y: number, w: number, h: number): string {
  return `
    <g transform="translate(${x}, ${y})">
      <!-- Background Card -->
      <rect width="${w}" height="${h}" rx="6" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
      
      <!-- Subtle Paper Coordinate Grid -->
      <g stroke="${C.cardBorderLight}" stroke-width="0.75" opacity="0.6">
        ${[45, 90, 135, 180, 225, 270].map(py => `<line x1="12" y1="${py}" x2="${w - 12}" y2="${py}"/>`).join('')}
        ${[100, 200, 300, 400, 500].map(px => `<line x1="${px}" y1="12" x2="${px}" y2="${h - 12}"/>`).join('')}
      </g>

      <!-- Taurus Coastal Mountain Silhouette with Topographic Elevation Bands -->
      <path d="M 12,${h - 52} L 95,${h - 118} L 175,${h - 85} L 260,${h - 135} L 350,${h - 75} L 450,${h - 110} L ${w - 12},${h - 52} Z" fill="#DCE5EB" opacity="0.8"/>
      <!-- Snow Peak Caps -->
      <polygon points="260,${h - 135} 278,${h - 112} 242,${h - 112}" fill="#FFFFFF" opacity="0.95"/>
      <polygon points="95,${h - 118} 108,${h - 98} 82,${h - 98}" fill="#FFFFFF" opacity="0.95"/>
      <polygon points="450,${h - 110} 462,${h - 92} 438,${h - 92}" fill="#FFFFFF" opacity="0.95"/>

      <!-- Mediterranean Coastal Water Body -->
      <line x1="12" y1="${h - 52}" x2="${w - 12}" y2="${h - 52}" stroke="${C.steelMid}" stroke-width="1.4"/>
      <rect x="12" y="${h - 51}" width="${w - 24}" height="38" fill="#D3E0E7" opacity="0.7"/>
      <!-- Wave Line Filigree -->
      <line x1="24" y1="${h - 38}" x2="${w - 24}" y2="${h - 38}" stroke="${C.steelLight}" stroke-width="1.2" stroke-dasharray="10,6"/>
      <line x1="45" y1="${h - 26}" x2="${w - 45}" y2="${h - 26}" stroke="${C.steelLight}" stroke-width="1.2" stroke-dasharray="14,8"/>
      <!-- Offshore Wind Turbines (Renewable Theme) -->
      <g transform="translate(480, ${h - 82})">
        <line x1="0" y1="30" x2="0" y2="0" stroke="${C.steelDark}" stroke-width="1.5"/>
        <circle cx="0" cy="0" r="2.5" fill="${C.steelDark}"/>
        <line x1="0" y1="0" x2="-12" y2="-10" stroke="${C.steelMid}" stroke-width="1.2"/>
        <line x1="0" y1="0" x2="14" y2="-6" stroke="${C.steelMid}" stroke-width="1.2"/>
        <line x1="0" y1="0" x2="-2" y2="15" stroke="${C.steelMid}" stroke-width="1.2"/>
      </g>
      <g transform="translate(515, ${h - 74})">
        <line x1="0" y1="22" x2="0" y2="0" stroke="${C.steelDark}" stroke-width="1.2"/>
        <circle cx="0" cy="0" r="2" fill="${C.steelDark}"/>
        <line x1="0" y1="0" x2="-9" y2="-8" stroke="${C.steelMid}" stroke-width="1"/>
        <line x1="0" y1="0" x2="10" y2="-4" stroke="${C.steelMid}" stroke-width="1"/>
      </g>

      <!-- Stylized Globe (Top-Right of Hero Panel) -->
      <g transform="translate(415, 122)">
        <!-- Globe Outer Ring & Atmospheric Shadow -->
        <circle cx="0" cy="0" r="84" fill="#E4ECF2" stroke="${C.steelMid}" stroke-width="2"/>
        <path d="M 0,-84 A 84 84 0 0 1 84,0 A 84 84 0 0 1 0,84 Z" fill="${C.steelDark}" opacity="0.08"/>
        
        <!-- Latitude Parallels -->
        <ellipse cx="0" cy="0" rx="84" ry="46" fill="none" stroke="${C.steelLight}" stroke-width="1.2" stroke-dasharray="3,3"/>
        <ellipse cx="0" cy="0" rx="84" ry="22" fill="none" stroke="${C.steelLight}" stroke-width="1.2"/>
        <line x1="-84" y1="0" x2="84" y2="0" stroke="${C.steelMid}" stroke-width="1.4"/>
        
        <!-- Longitude Meridians -->
        <ellipse cx="0" cy="0" rx="48" ry="84" fill="none" stroke="${C.steelLight}" stroke-width="1.2"/>
        <ellipse cx="0" cy="0" rx="22" ry="84" fill="none" stroke="${C.steelLight}" stroke-width="1.2"/>
        <line x1="0" y1="-84" x2="0" y2="84" stroke="${C.steelMid}" stroke-width="1.4"/>

        <!-- Mediterranean & Anatolian Coastline Silhouette -->
        <path d="M -38,-28 Q -16,-44 14,-26 Q 42,-15 48,12 Q 24,30 -10,16 Z" fill="${C.steelMid}" opacity="0.85"/>
        <path d="M -58,8 Q -36,4 -24,26 Q -48,40 -64,22 Z" fill="${C.steelDark}" opacity="0.6"/>
        
        <!-- Summit Marker at Antalya (Red Pin & Flag) -->
        <circle cx="16" cy="-8" r="5" fill="${C.crimson}"/>
        <circle cx="16" cy="-8" r="9" fill="none" stroke="${C.crimson}" stroke-width="1.5"/>
        <line x1="16" y1="-8" x2="34" y2="-24" stroke="${C.crimson}" stroke-width="1.5"/>
        <rect x="36" y="-33" width="56" height="17" rx="3" fill="${C.crimson}"/>
        <text x="64" y="-21.5" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.5" font-weight="900" fill="#FFFFFF" letter-spacing="1">COP31</text>
      </g>

      <!-- Modern Summit Pavilion Architecture (Left Foreground) -->
      <!-- Plaza Base & Stepped Terrace -->
      <polygon points="24,${h - 52} 280,${h - 52} 335,${h - 22} 8,${h - 22}" fill="${C.steelDark}"/>
      <line x1="18" y1="${h - 37}" x2="320" y2="${h - 37}" stroke="${C.steelLight}" stroke-width="1.2"/>

      <!-- Cantilever Wing Roof (Layered Modern Geometry) -->
      <polygon points="36,${h - 165} 230,${h - 208} 262,${h - 145} 68,${h - 102}" fill="${C.steelDark}"/>
      <polygon points="52,${h - 172} 245,${h - 215} 258,${h - 198} 65,${h - 156}" fill="${C.steelMid}"/>
      <!-- Roof Louver Details -->
      <line x1="80" y1="${h - 158}" x2="225" y2="${h - 190}" stroke="${C.cardBg}" stroke-width="1" opacity="0.8"/>
      <line x1="90" y1="${h - 146}" x2="235" y2="${h - 178}" stroke="${C.cardBg}" stroke-width="1" opacity="0.8"/>
      <line x1="100" y1="${h - 134}" x2="245" y2="${h - 166}" stroke="${C.cardBg}" stroke-width="1" opacity="0.8"/>
      
      <!-- Architectural Glass Facade & Columns -->
      <polygon points="68,${h - 102} 262,${h - 145} 256,${h - 52} 62,${h - 52}" fill="#C5D6E1" opacity="0.8"/>
      <!-- Diagonal Bracings on Glass -->
      <line x1="68" y1="${h - 102}" x2="110" y2="${h - 52}" stroke="${C.steelLight}" stroke-width="1.2" opacity="0.7"/>
      <line x1="110" y1="${h - 110}" x2="160" y2="${h - 52}" stroke="${C.steelLight}" stroke-width="1.2" opacity="0.7"/>
      <line x1="160" y1="${h - 120}" x2="210" y2="${h - 52}" stroke="${C.steelLight}" stroke-width="1.2" opacity="0.7"/>
      <line x1="210" y1="${h - 132}" x2="256" y2="${h - 52}" stroke="${C.steelLight}" stroke-width="1.2" opacity="0.7"/>
      
      <!-- Vertical Structural Columns -->
      <line x1="105" y1="${h - 110}" x2="100" y2="${h - 52}" stroke="${C.steelDark}" stroke-width="3"/>
      <line x1="148" y1="${h - 119}" x2="142" y2="${h - 52}" stroke="${C.steelDark}" stroke-width="3"/>
      <line x1="190" y1="${h - 128}" x2="184" y2="${h - 52}" stroke="${C.steelDark}" stroke-width="3"/>
      <line x1="230" y1="${h - 138}" x2="224" y2="${h - 52}" stroke="${C.steelDark}" stroke-width="3"/>
      
      <!-- Grand Entrance Plaza Pavement -->
      <line x1="62" y1="${h - 52}" x2="256" y2="${h - 52}" stroke="${C.inkNavy}" stroke-width="2"/>
      
      <!-- Summit Flags atop Roof -->
      <g>
        <!-- Flag 1 (Crimson) -->
        <line x1="46" y1="${h - 165}" x2="46" y2="${h - 212}" stroke="${C.inkNavy}" stroke-width="2"/>
        <polygon points="46,${h - 212} 70,${h - 203} 46,${h - 194}" fill="${C.crimson}"/>

        <!-- Flag 2 (Steel) -->
        <line x1="115" y1="${h - 180}" x2="115" y2="${h - 225}" stroke="${C.inkNavy}" stroke-width="2"/>
        <polygon points="115,${h - 225} 139,${h - 216} 115,${h - 207}" fill="${C.steelMid}"/>

        <!-- Flag 3 (Navy) -->
        <line x1="184" y1="${h - 195}" x2="184" y2="${h - 238}" stroke="${C.inkNavy}" stroke-width="2"/>
        <polygon points="184,${h - 238} 208,${h - 229} 184,${h - 220}" fill="${C.inkNavy}"/>
      </g>

      <!-- Technical Summit Caption Pill -->
      <g transform="translate(18, 16)">
        <rect x="0" y="0" width="148" height="18" rx="3" fill="${C.steelDark}"/>
        <text x="74" y="12.5" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.5" font-weight="800" fill="#FFFFFF" letter-spacing="1">ANTALYA PLENARY HALL</text>
      </g>

      <!-- Solar / Carbon Transition Reticle -->
      <g transform="translate(492, 45)">
        <circle cx="0" cy="0" r="16" fill="none" stroke="${C.steelMid}" stroke-width="1.5"/>
        <circle cx="0" cy="0" r="6" fill="${C.steelMid}"/>
        <line x1="0" y1="-22" x2="0" y2="-17" stroke="${C.steelMid}" stroke-width="1.8"/>
        <line x1="0" y1="17" x2="0" y2="22" stroke="${C.steelMid}" stroke-width="1.8"/>
        <line x1="-22" y1="0" x2="-17" y2="0" stroke="${C.steelMid}" stroke-width="1.8"/>
        <line x1="17" y1="0" x2="22" y2="0" stroke="${C.steelMid}" stroke-width="1.8"/>
      </g>
    </g>
  `;
}

// ============================================================================
// 2. MIDDLE EAST — Geodesic Radar Dome & Crimson Interception Arc
// ============================================================================
function renderMissileIllustration(x: number, y: number, w: number, h: number): string {
  return `
    <g transform="translate(${x}, ${y})">
      <!-- Background Card -->
      <rect width="${w}" height="${h}" rx="6" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
      
      <!-- Subtle Paper Grid Lines -->
      <g stroke="${C.cardBorderLight}" stroke-width="0.75" opacity="0.6">
        ${[50, 100, 150, 200, 250].map(py => `<line x1="12" y1="${py}" x2="${w - 12}" y2="${py}"/>`).join('')}
        ${[90, 180, 270].map(px => `<line x1="${px}" y1="12" x2="${px}" y2="${h - 12}"/>`).join('')}
      </g>

      <!-- Desert Terrain Silhouette & Contour Sand Dunes -->
      <path d="M 12,${h - 32} Q 110,${h - 52} 200,${h - 36} T ${w - 12},${h - 40} L ${w - 12},${h - 12} L 12,${h - 12} Z" fill="#DDD5C4"/>
      <path d="M 12,${h - 22} Q 95,${h - 34} 180,${h - 24} T ${w - 12},${h - 26} L ${w - 12},${h - 12} L 12,${h - 12} Z" fill="#CCC3B0"/>
      <!-- Dune Crest Accent Line -->
      <path d="M 12,${h - 32} Q 110,${h - 52} 200,${h - 36} T ${w - 12},${h - 40}" fill="none" stroke="${C.steelDark}" stroke-width="1" opacity="0.4"/>

      <!-- Defensive Air Defense Installation -->
      <g transform="translate(68, ${h - 36})">
        <!-- Fortified Platform Foundation -->
        <rect x="-42" y="-10" width="84" height="10" fill="${C.steelDark}" rx="2"/>
        <line x1="-38" y1="-5" x2="38" y2="-5" stroke="${C.steelLight}" stroke-width="1"/>

        <!-- Geodesic Radar Dome -->
        <path d="M -35,-10 A 35 35 0 0 1 35,-10 Z" fill="${C.steelDark}"/>
        <!-- Geodesic Hexagonal Facets -->
        <path d="M -26,-10 A 26 26 0 0 1 26,-10" fill="none" stroke="${C.steelMid}" stroke-width="1.5"/>
        <path d="M -15,-10 A 15 15 0 0 1 15,-10" fill="none" stroke="${C.steelMid}" stroke-width="1.2"/>
        <line x1="0" y1="-45" x2="0" y2="-10" stroke="${C.steelMid}" stroke-width="1.6"/>
        <line x1="-20" y1="-10" x2="-10" y2="-38" stroke="${C.steelMid}" stroke-width="1.2"/>
        <line x1="20" y1="-10" x2="10" y2="-38" stroke="${C.steelMid}" stroke-width="1.2"/>
        <circle cx="0" cy="-45" r="2.5" fill="${C.crimson}"/>

        <!-- Elevated Missile Launcher Battery (Canisters at 65° ready elevation) -->
        <g transform="translate(48, -10)">
          <rect x="-8" y="-6" width="16" height="6" fill="${C.inkNavy}"/>
          <!-- Launcher Box -->
          <polygon points="-6,-6 10,-32 16,-29 0,-3" fill="${C.steelDark}"/>
          <line x1="-6" y1="-6" x2="10" y2="-32" stroke="${C.steelLight}" stroke-width="1.2"/>
          <line x1="0" y1="-3" x2="16" y2="-29" stroke="${C.steelLight}" stroke-width="1.2"/>
          <circle cx="13" cy="-30.5" r="2" fill="${C.crimson}"/>
        </g>

        <!-- Communications & Radar Mast -->
        <line x1="-32" y1="-10" x2="-32" y2="-38" stroke="${C.inkNavy}" stroke-width="1.8"/>
        <line x1="-38" y1="-30" x2="-26" y2="-30" stroke="${C.inkNavy}" stroke-width="1.4"/>
        <circle cx="-32" cy="-38" r="2" fill="${C.steelMid}"/>
      </g>

      <!-- Spherical Radar Waves Radiating from Battery -->
      <path d="M 68,${h - 68} A 85 85 0 0 1 153,${h - 105}" fill="none" stroke="${C.steelLight}" stroke-width="1.5" stroke-dasharray="3,3"/>
      <path d="M 68,${h - 68} A 145 145 0 0 1 208,${h - 150}" fill="none" stroke="${C.steelLight}" stroke-width="1.5" stroke-dasharray="4,4"/>
      <path d="M 68,${h - 68} A 205 205 0 0 1 268,${h - 195}" fill="none" stroke="${C.steelLight}" stroke-width="1.5" stroke-dasharray="5,5"/>

      <!-- Incoming Missile Hostile Path (Dashed Navy) -->
      <path d="M ${w - 22},30 Q ${w - 75},68 ${w - 132},102" fill="none" stroke="${C.inkNavy}" stroke-width="2" stroke-dasharray="5,3"/>
      
      <!-- Intercept Point & Kinetic Starburst Flash -->
      <g transform="translate(${w - 132}, 102)">
        <!-- Flash Aura -->
        <circle cx="0" cy="0" r="24" fill="${C.crimsonLight}" opacity="0.6"/>
        <circle cx="0" cy="0" r="14" fill="${C.crimson}" opacity="0.35"/>
        <circle cx="0" cy="0" r="5" fill="${C.crimson}"/>
        <!-- Kinetic Flash Rays -->
        <line x1="-18" y1="0" x2="18" y2="0" stroke="${C.crimson}" stroke-width="2.5"/>
        <line x1="0" y1="-18" x2="0" y2="18" stroke="${C.crimson}" stroke-width="2.5"/>
        <line x1="-13" y1="-13" x2="13" y2="13" stroke="${C.crimson}" stroke-width="2"/>
        <line x1="-13" y1="13" x2="13" y2="-13" stroke="${C.crimson}" stroke-width="2"/>
        <circle cx="0" cy="0" r="8" fill="none" stroke="${C.crimson}" stroke-width="1.5"/>
      </g>

      <!-- Bold Crimson Interception Arc -->
      <path d="M 72,${h - 75} Q 130,36 ${w - 132},102" fill="none" stroke="${C.crimson}" stroke-width="3.2"/>

      <!-- Neutralized Missile Silhouette Deflected -->
      <g transform="translate(${w - 98}, 76) rotate(-48)">
        <polygon points="0,-22 7,2 3,18 -3,18 -7,2" fill="${C.inkNavy}"/>
        <polygon points="3,8 12,18 3,16" fill="${C.steelDark}"/>
        <polygon points="-3,8 -12,18 -3,16" fill="${C.steelDark}"/>
        <polygon points="0,-22 3,-9 -3,-9" fill="${C.crimson}"/>
        <!-- Fragmented Debris Sparks -->
        <circle cx="10" cy="-6" r="1.5" fill="${C.crimson}"/>
        <circle cx="14" cy="8" r="1.5" fill="${C.crimson}"/>
        <circle cx="-12" cy="2" r="1.5" fill="${C.steelDark}"/>
      </g>
      
      <!-- Defensive Sector Tactical Badge -->
      <g transform="translate(16, 16)">
        <rect x="0" y="0" width="136" height="18" rx="3" fill="${C.steelDark}"/>
        <text x="68" y="12.5" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.5" font-weight="800" fill="#FFFFFF" letter-spacing="1">AIR DEFENSE BATTERY</text>
      </g>

      <!-- Telemetry Coordinates -->
      <text x="${w - 16}" y="24" text-anchor="end" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="800" fill="${C.crimson}" letter-spacing="1">INTERCEPT: CONFIRMED</text>
    </g>
  `;
}

// ============================================================================
// 3. TECH / US-CHINA — Dual Server Stack & Fiber-Optic Topology
// ============================================================================
function renderServerIllustration(x: number, y: number, w: number, h: number): string {
  return `
    <g transform="translate(${x}, ${y})">
      <!-- Background Card -->
      <rect width="${w}" height="${h}" rx="6" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
      
      <!-- Fine Tech Grid -->
      <g stroke="${C.cardBorderLight}" stroke-width="0.75" opacity="0.6">
        ${[40, 80, 120, 160, 200, 240].map(py => `<line x1="8" y1="${py}" x2="${w - 8}" y2="${py}"/>`).join('')}
        ${[60, 120, 180, 240].map(px => `<line x1="${px}" y1="8" x2="${px}" y2="${h - 8}"/>`).join('')}
      </g>

      <!-- Enterprise Server Tower Chassis (Front Elevation with Depth) -->
      <g transform="translate(18, 18)">
        <!-- Outer Rack Frame -->
        <rect x="0" y="0" width="108" height="${h - 36}" rx="4" fill="${C.inkNavy}"/>
        <rect x="4" y="4" width="100" height="${h - 44}" rx="2" fill="${C.steelDark}"/>

        <!-- 5 Server Blade Trays -->
        ${[0, 1, 2, 3, 4].map(i => {
          const sy = 8 + i * 46;
          return `
            <g transform="translate(6, ${sy})">
              <!-- Tray Case -->
              <rect x="0" y="0" width="88" height="40" rx="2" fill="${C.inkNavy}" stroke="${C.steelMid}" stroke-width="1"/>
              <!-- Drive Bays & Ventilation Hex Mesh -->
              <rect x="5" y="6" width="38" height="12" rx="1" fill="${C.steelDark}"/>
              <line x1="8" y1="10" x2="38" y2="10" stroke="${C.steelLight}" stroke-width="1"/>
              <rect x="5" y="21" width="38" height="12" rx="1" fill="${C.steelDark}"/>
              <line x1="8" y1="25" x2="38" y2="25" stroke="${C.steelLight}" stroke-width="1"/>
              
              <!-- Hot-swap Latch -->
              <rect x="46" y="8" width="8" height="24" rx="1" fill="${C.steelMid}"/>
              <line x1="50" y1="12" x2="50" y2="28" stroke="${C.inkNavy}" stroke-width="1"/>

              <!-- Status LEDs -->
              <circle cx="62" cy="14" r="2.5" fill="${i === 1 || i === 3 ? C.crimson : '#10B981'}"/>
              <circle cx="70" cy="14" r="2.5" fill="${C.steelLight}"/>
              <circle cx="78" cy="14" r="2.5" fill="${C.steelMid}"/>
              <!-- Network Port -->
              <rect x="60" y="22" width="18" height="10" rx="1" fill="${C.steelDark}" stroke="${C.steelMid}" stroke-width="1"/>
              <circle cx="65" cy="27" r="1.5" fill="${i === 2 ? C.crimson : '#10B981'}"/>
              <circle cx="73" cy="27" r="1.5" fill="${C.steelLight}"/>
            </g>
          `;
        }).join('')}
      </g>

      <!-- Fiber-Optic Bus & Semiconductor Circuit Topology -->
      <g transform="translate(138, 20)">
        <!-- Multi-lane Bus Lines -->
        <path d="M 0,26 H 42 V 52 H 95" fill="none" stroke="${C.steelMid}" stroke-width="2.2"/>
        <path d="M 0,68 H 72 V 96 H 135" fill="none" stroke="${C.steelDark}" stroke-width="2.2"/>
        <!-- Blocked / Curbs Line (Crimson Dashed) -->
        <path d="M 0,112 H 38 V 144 H 88 V 122 H 125" fill="none" stroke="${C.crimson}" stroke-width="2.5" stroke-dasharray="5,3"/>
        <path d="M 0,156 H 60 V 186 H 130" fill="none" stroke="${C.steelLight}" stroke-width="2.2"/>
        <path d="M 0,200 H 94 V 212 H 120" fill="none" stroke="${C.steelMid}" stroke-width="2.2"/>

        <!-- High-Speed Interconnect Nodes -->
        <circle cx="42" cy="52" r="4.5" fill="${C.steelDark}"/>
        <circle cx="95" cy="52" r="5.5" fill="${C.steelMid}"/>
        <circle cx="72" cy="96" r="4.5" fill="${C.steelDark}"/>
        <circle cx="135" cy="96" r="6.5" fill="${C.steelDark}"/>
        <circle cx="88" cy="122" r="4.5" fill="${C.crimson}"/>
        <circle cx="125" cy="122" r="5.5" fill="${C.crimson}"/>
        <circle cx="130" cy="186" r="5.5" fill="${C.steelMid}"/>
        
        <!-- Central AI Silicon Chip Package -->
        <g transform="translate(86, 20)">
          <rect x="0" y="0" width="38" height="38" rx="4" fill="${C.steelDark}" stroke="${C.inkNavy}" stroke-width="1.8"/>
          <!-- Substrate Grid -->
          <rect x="7" y="7" width="24" height="24" fill="${C.cardBg}" stroke="${C.steelMid}" stroke-width="1"/>
          <circle cx="19" cy="19" r="5" fill="${C.crimson}"/>
          <!-- Pin Connectors -->
          <line x1="-3" y1="12" x2="0" y2="12" stroke="${C.steelMid}" stroke-width="1.5"/>
          <line x1="-3" y1="19" x2="0" y2="19" stroke="${C.steelMid}" stroke-width="1.5"/>
          <line x1="-3" y1="26" x2="0" y2="26" stroke="${C.steelMid}" stroke-width="1.5"/>
          <line x1="38" y1="12" x2="41" y2="12" stroke="${C.steelMid}" stroke-width="1.5"/>
          <line x1="38" y1="19" x2="41" y2="19" stroke="${C.steelMid}" stroke-width="1.5"/>
          <line x1="38" y1="26" x2="41" y2="26" stroke="${C.steelMid}" stroke-width="1.5"/>
        </g>
      </g>

      <!-- Regulatory Restriction Barrier Stamp -->
      <g transform="translate(${w - 86}, ${h - 38})">
        <rect x="0" y="0" width="72" height="22" rx="3" fill="${C.crimson}"/>
        <text x="36" y="15" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.5" font-weight="900" fill="#FFFFFF" letter-spacing="1">CURB ACT</text>
      </g>
    </g>
  `;
}

// ============================================================================
// 4. EUROPE / NATO — Complete Tactical Radar PPI Scope & Incursion Blip
// ============================================================================
function renderRadarIllustration(x: number, y: number, w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2 + 8;
  const r = 84;

  return `
    <g transform="translate(${x}, ${y})">
      <!-- Background Card -->
      <rect width="${w}" height="${h}" rx="6" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
      
      <!-- Scope Outer Housing & Graduated Compass Bezel -->
      <circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="#DDD7C7" stroke="${C.inkNavy}" stroke-width="1.5"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#E4DFD2" stroke="${C.inkNavy}" stroke-width="3"/>
      
      <!-- Compass Degree Tick Marks -->
      ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
        const rad = (deg * Math.PI) / 180;
        const x1 = cx + (r + 1) * Math.cos(rad);
        const y1 = cy + (r + 1) * Math.sin(rad);
        const x2 = cx + (r + 6) * Math.cos(rad);
        const y2 = cy + (r + 6) * Math.sin(rad);
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${C.inkNavy}" stroke-width="${deg % 90 === 0 ? 1.8 : 1}"/>`;
      }).join('')}

      <!-- Cardinal Compass Labels -->
      <text x="${cx}" y="${cy - r - 10}" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="900" fill="${C.inkNavy}">N</text>
      <text x="${cx + r + 13}" y="${cy + 3}" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="900" fill="${C.inkNavy}">E</text>
      <text x="${cx}" y="${cy + r + 16}" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="900" fill="${C.inkNavy}">S</text>
      <text x="${cx - r - 13}" y="${cy + 3}" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="900" fill="${C.inkNavy}">W</text>

      <!-- Concentric Range Rings -->
      <circle cx="${cx}" cy="${cy}" r="${r * 0.75}" fill="none" stroke="${C.steelLight}" stroke-width="1.2" stroke-dasharray="3,3"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.50}" fill="none" stroke="${C.steelLight}" stroke-width="1.2" stroke-dasharray="3,3"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.25}" fill="none" stroke="${C.steelLight}" stroke-width="1"/>

      <!-- Crosshairs & Azimuth Axes -->
      <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${C.steelMid}" stroke-width="1.2"/>
      <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="${C.steelMid}" stroke-width="1.2"/>
      <line x1="${cx - r * 0.7}" y1="${cy - r * 0.7}" x2="${cx + r * 0.7}" y2="${cy + r * 0.7}" stroke="${C.steelLight}" stroke-width="0.8"/>
      <line x1="${cx - r * 0.7}" y1="${cy + r * 0.7}" x2="${cx + r * 0.7}" y2="${cy - r * 0.7}" stroke="${C.steelLight}" stroke-width="0.8"/>

      <!-- Rotating Sweep Sector Wedge -->
      <path d="M ${cx},${cy} L ${cx + r * 0.92},${cy - r * 0.38} A ${r} ${r} 0 0 0 ${cx + r * 0.6},${cy - r * 0.8} Z" fill="${C.steelMid}" opacity="0.35"/>

      <!-- NATO Eastern Flank Border Line (Poland Border) -->
      <path d="M ${cx - 52},${cy - 78} Q ${cx - 15},${cy - 20} ${cx - 45},${cy + 74}" fill="none" stroke="${C.steelDark}" stroke-width="2" stroke-dasharray="6,3"/>

      <!-- Friendly NATO Combat Air Patrol Track -->
      <circle cx="${cx - 30}" cy="${cy + 26}" r="3.5" fill="${C.steelDark}"/>
      <line x1="${cx - 30}" y1="${cy + 26}" x2="${cx - 18}" y2="${cy + 14}" stroke="${C.steelDark}" stroke-width="1.6"/>
      <text x="${cx - 36}" y="${cy + 38}" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="6.5" font-weight="800" fill="${C.steelDark}">NATO CAP</text>

      <!-- Incursion Alert Target Blip (Crimson Tracking Beacon) -->
      <g transform="translate(${cx + 44}, ${cy - 36})">
        <circle cx="0" cy="0" r="12" fill="none" stroke="${C.crimson}" stroke-width="1.4" stroke-dasharray="2,2"/>
        <circle cx="0" cy="0" r="5" fill="${C.crimson}"/>
        <!-- Incursion Heading Vector Crossing Border -->
        <line x1="0" y1="0" x2="-24" y2="16" stroke="${C.crimson}" stroke-width="2.2"/>
        <polygon points="-24,16 -16,16 -21,10" fill="${C.crimson}"/>
        <!-- Target Tag -->
        <rect x="8" y="-15" width="48" height="14" rx="2" fill="${C.crimson}"/>
        <text x="32" y="-5" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="900" fill="#FFFFFF" letter-spacing="0.5">TRK 084</text>
      </g>

      <!-- Tactical Readout Headers -->
      <text x="16" y="20" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="800" fill="${C.mutedSlate}" letter-spacing="1">RANGE: 300 KM</text>
      <text x="${w - 16}" y="20" text-anchor="end" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="900" fill="${C.crimson}" letter-spacing="1">SCRAMBLE</text>
    </g>
  `;
}

// ============================================================================
// 5. AFRICA / NIGERIA — Solemn Maritime Swell & Vessel Silhouette
// ============================================================================
function renderOceanIllustration(x: number, y: number, w: number, h: number): string {
  return `
    <g transform="translate(${x}, ${y})">
      <!-- Background Card -->
      <rect width="${w}" height="${h}" rx="6" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>

      <!-- Atmospheric Dusk Sky -->
      <rect x="1" y="1" width="${w - 2}" height="${h * 0.44}" fill="#E5DFD1" rx="5"/>
      <line x1="12" y1="${h * 0.44}" x2="${w - 12}" y2="${h * 0.44}" stroke="${C.cardBorder}" stroke-width="1"/>

      <!-- Distant Shoreline Mangrove Silhouette -->
      <path d="M 12,${h * 0.44} Q 70,${h * 0.41} 140,${h * 0.43} T 240,${h * 0.42} L ${w - 12},${h * 0.44} Z" fill="#C5BCA8"/>

      <!-- Distant Search & Rescue Beacon Beam -->
      <polygon points="${w - 38},22 35,${h * 0.44} 75,${h * 0.44}" fill="#FFF8DC" opacity="0.5"/>
      <circle cx="${w - 38}" cy="22" r="3.5" fill="${C.crimson}"/>
      <line x1="${w - 38}" y1="22" x2="${w - 38}" y2="${h * 0.44}" stroke="${C.steelDark}" stroke-width="2"/>

      <!-- Solemn River Wave Silhouette Layer 1 (Back Swell) -->
      <path d="M 0,${h * 0.44} Q 60,${h * 0.36} 130,${h * 0.46} T 240,${h * 0.43} Q 275,${h * 0.48} ${w},${h * 0.41} L ${w},${h} L 0,${h} Z" fill="${C.steelLight}"/>
      <path d="M 0,${h * 0.44} Q 60,${h * 0.36} 130,${h * 0.46} T 240,${h * 0.43} Q 275,${h * 0.48} ${w},${h * 0.41}" fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity="0.7"/>

      <!-- Solemn River Wave Layer 2 (Mid Surge) -->
      <path d="M 0,${h * 0.58} Q 70,${h * 0.47} 150,${h * 0.60} T 270,${h * 0.55} L ${w},${h * 0.53} L ${w},${h} L 0,${h} Z" fill="${C.steelMid}"/>
      <path d="M 0,${h * 0.58} Q 70,${h * 0.47} 150,${h * 0.60} T 270,${h * 0.55} L ${w},${h * 0.53}" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.85"/>

      <!-- Stylized Capsizing River Passenger Boat (Pirogue/Ferry) -->
      <g transform="translate(132, ${h * 0.52}) rotate(28)">
        <!-- Tilted Hull -->
        <path d="M -36,0 L 34,-5 L 40,11 L -32,9 Z" fill="${C.inkNavy}"/>
        <line x1="-34" y1="4" x2="36" y2="0" stroke="${C.steelLight}" stroke-width="1.2"/>
        <!-- Deck Canopy Framework -->
        <line x1="-20" y1="0" x2="-20" y2="-14" stroke="${C.inkNavy}" stroke-width="2.2"/>
        <line x1="0" y1="-2" x2="0" y2="-16" stroke="${C.inkNavy}" stroke-width="2.2"/>
        <line x1="20" y1="-3" x2="20" y2="-15" stroke="${C.inkNavy}" stroke-width="2.2"/>
        <line x1="-24" y1="-14" x2="24" y2="-16" stroke="${C.inkNavy}" stroke-width="2.8"/>
        <!-- Water Turbulence Foam -->
        <circle cx="38" cy="4" r="3.5" fill="#FFFFFF" opacity="0.95"/>
        <circle cx="46" cy="11" r="2.8" fill="#FFFFFF" opacity="0.85"/>
        <circle cx="52" cy="18" r="2" fill="#FFFFFF" opacity="0.75"/>
      </g>

      <!-- Solemn River Wave Layer 3 (Deep Foreground Water) -->
      <path d="M 0,${h * 0.74} Q 80,${h * 0.63} 170,${h * 0.76} T ${w},${h * 0.69} L ${w},${h} L 0,${h} Z" fill="${C.steelDark}"/>
      <path d="M 0,${h * 0.74} Q 80,${h * 0.63} 170,${h * 0.76} T ${w},${h * 0.69}" fill="none" stroke="#FFFFFF" stroke-width="2.2" opacity="0.95"/>
      
      <!-- Solemn Remembrance Lifebuoy Accent in Foreground -->
      <g transform="translate(${w - 44}, ${h - 32})">
        <circle cx="0" cy="0" r="10" fill="none" stroke="${C.crimson}" stroke-width="3.5"/>
        <circle cx="0" cy="0" r="4.5" fill="${C.steelDark}"/>
        <line x1="0" y1="-14" x2="0" y2="14" stroke="#FFFFFF" stroke-width="1.4"/>
        <line x1="-14" y1="0" x2="14" y2="0" stroke="#FFFFFF" stroke-width="1.4"/>
        <circle cx="0" cy="0" r="15" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.6" stroke-dasharray="2,2"/>
      </g>

      <!-- Location Caption -->
      <text x="16" y="20" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="800" fill="${C.mutedSlate}" letter-spacing="1">NIGER RIVER BASIN</text>
    </g>
  `;
}

function buildSVG(data: NewsData): string {
  const stories = data.stories;
  const hero = stories.find(s => s.position === 'hero') || stories[0];
  const topRight = stories.find(s => s.position === 'top-right') || stories[1];
  const bLeft = stories.find(s => s.position === 'bottom-left') || stories[2];
  const bCenter = stories.find(s => s.position === 'bottom-center') || stories[3];
  const bRight = stories.find(s => s.position === 'bottom-right') || stories[4];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <!-- Deterministic Archival Paper Grain Filter -->
    <filter id="paper-texture" x="0%" y="0%" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="3" seed="20261122" result="noise"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.96  0 0 0 0 0.95  0 0 0 0 0.92  0 0 0 0.05 0" result="coloredNoise"/>
      <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="textured"/>
      <feBlend mode="multiply" in="SourceGraphic" in2="textured"/>
    </filter>

    <style>
      .masthead-title {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 52px;
        font-weight: 900;
        fill: ${C.inkNavy};
        letter-spacing: 0.5px;
      }
      .masthead-kicker {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 9.5px;
        font-weight: 800;
        fill: ${C.mutedSlate};
        letter-spacing: 1.6px;
        text-transform: uppercase;
      }
      .masthead-subtitle {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 13px;
        font-style: italic;
        fill: ${C.charcoal};
      }
      .hero-headline {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 32px;
        font-weight: 900;
        fill: ${C.inkNavy};
        letter-spacing: -0.3px;
      }
      .hero-sub {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 14.5px;
        font-weight: 600;
        fill: ${C.charcoal};
      }
      .panel-headline {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 20px;
        font-weight: 900;
        fill: ${C.inkNavy};
        letter-spacing: -0.3px;
      }
      .panel-sub {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 12px;
        font-weight: 500;
        fill: ${C.charcoal};
      }
      .source-line {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 9px;
        font-weight: 700;
        fill: ${C.mutedSlate};
        letter-spacing: 0.8px;
        text-transform: uppercase;
      }
      .footer-text {
        font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
        font-size: 11px;
        font-weight: 800;
        fill: ${C.charcoal};
        letter-spacing: 2.2px;
      }
    </style>
  </defs>

  <!-- Archival Canvas Background -->
  <rect width="1024" height="1024" fill="${C.paper}"/>

  <!-- ==================== MASTHEAD (Top 148px) ==================== -->
  <g id="masthead">
    <!-- Top Folio / Kicker -->
    <text x="32" y="32" class="masthead-kicker">INTERNATIONAL EDITION • THE GLOBAL SUNDAY RECORD • ISSUE NO. 2,841</text>
    
    <!-- Title -->
    <text x="32" y="82" class="masthead-title">WORLD NEWS</text>
    
    <!-- Subtitle / Strapline -->
    <text x="34" y="106" class="masthead-subtitle">The Sunday Daily Briefing • Five Regional Reports • Verified Dispatches</text>

    <!-- Top-Right Crimson Date Badge -->
    <g transform="translate(760, 36)">
      <rect width="232" height="68" rx="6" fill="${C.crimson}"/>
      <!-- Hairline Inner Accent Border -->
      <rect x="3" y="3" width="226" height="62" rx="4" fill="none" stroke="#FFFFFF" stroke-width="1" stroke-opacity="0.25"/>
      <text x="116" y="22" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="9" font-weight="800" fill="${C.crimsonLight}" letter-spacing="1.8">SUNDAY DISPATCH • DAILY RECORD</text>
      <text x="116" y="47" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" letter-spacing="1.2">22 NOVEMBER 2026</text>
      <text x="116" y="60" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="800" fill="${C.crimsonLight}" letter-spacing="1.2" opacity="0.9">ISSUE NO. 2,841 • WORLDWIDE</text>
    </g>

    <!-- Double Horizontal Rule -->
    <line x1="32" y1="126" x2="992" y2="126" stroke="${C.inkNavy}" stroke-width="3"/>
    <line x1="32" y1="131" x2="992" y2="131" stroke="${C.inkNavy}" stroke-width="1"/>
  </g>

  <!-- ==================== TOP ROW (y: 142 to 570) ==================== -->
  
  <!-- Panel 1: Top-Left Hero (60% width: x: 32 to 588) -->
  <g id="panel-hero" transform="translate(32, 144)">
    ${renderCategoryPill(0, 0, hero.label, hero.status)}
    
    <text x="0" y="38" class="hero-headline">${hero.headline}</text>
    <text x="0" y="59" class="hero-sub">${hero.subtitle}</text>
    <text x="0" y="78" class="source-line">SOURCE: ${hero.sources}</text>

    <!-- Bespoke Flat-Editorial Illustration -->
    ${renderClimateIllustration(0, 92, 556, 328)}
  </g>

  <!-- Vertical Hairline Divider between Hero and Top-Right -->
  <line x1="604" y1="144" x2="604" y2="570" stroke="${C.divider}" stroke-width="1.5"/>

  <!-- Panel 2: Top-Right (40% width: x: 620 to 992) -->
  <g id="panel-top-right" transform="translate(620, 144)">
    ${renderCategoryPill(0, 0, topRight.label, topRight.status)}

    <text x="0" y="38" class="panel-headline" font-size="24">${topRight.headline}</text>
    <text x="0" y="58" class="panel-sub" font-size="12.5" font-weight="600">Houthi launch blocked over southern airspace</text>
    <text x="0" y="74" class="panel-sub" font-size="12.5" font-weight="600">Iran plans nationwide winter power rationing</text>
    <text x="0" y="94" class="source-line">SOURCE: ${topRight.sources}</text>

    <!-- Bespoke Flat-Editorial Illustration -->
    ${renderMissileIllustration(0, 106, 372, 314)}
  </g>

  <!-- Horizontal Hairline Divider between Rows -->
  <line x1="32" y1="578" x2="992" y2="578" stroke="${C.divider}" stroke-width="1.5"/>

  <!-- ==================== BOTTOM ROW (y: 588 to 962) ==================== -->

  <!-- Panel 3: Bottom-Left (33.3% width: x: 32 to 330) -->
  <g id="panel-bottom-left" transform="translate(32, 588)">
    ${renderCategoryPill(0, 0, bLeft.label, bLeft.status)}

    <text x="0" y="34" class="panel-headline">${bLeft.headline}</text>
    <text x="0" y="53" class="panel-sub">${bLeft.subtitle}</text>
    <text x="0" y="71" class="source-line">SOURCE: ${bLeft.sources}</text>

    <!-- Bespoke Flat-Editorial Illustration -->
    ${renderServerIllustration(0, 84, 298, 286)}
  </g>

  <!-- Vertical Hairline Divider 1 -->
  <line x1="344" y1="588" x2="344" y2="962" stroke="${C.divider}" stroke-width="1.5"/>

  <!-- Panel 4: Bottom-Center (33.3% width: x: 358 to 666) -->
  <g id="panel-bottom-center" transform="translate(358, 588)">
    ${renderCategoryPill(0, 0, bCenter.label, bCenter.status)}

    <text x="0" y="34" class="panel-headline">${bCenter.headline}</text>
    <text x="0" y="53" class="panel-sub">${bCenter.subtitle}</text>
    <text x="0" y="71" class="source-line">SOURCE: ${bCenter.sources}</text>

    <!-- Bespoke Flat-Editorial Illustration -->
    ${renderRadarIllustration(0, 84, 308, 286)}
  </g>

  <!-- Vertical Hairline Divider 2 -->
  <line x1="680" y1="588" x2="680" y2="962" stroke="${C.divider}" stroke-width="1.5"/>

  <!-- Panel 5: Bottom-Right (33.3% width: x: 694 to 992) -->
  <g id="panel-bottom-right" transform="translate(694, 588)">
    ${renderCategoryPill(0, 0, bRight.label, bRight.status)}

    <text x="0" y="34" class="panel-headline">${bRight.headline}</text>
    <text x="0" y="53" class="panel-sub">${bRight.subtitle}</text>
    <text x="0" y="71" class="source-line">SOURCE: ${bRight.sources}</text>

    <!-- Bespoke Flat-Editorial Illustration -->
    ${renderOceanIllustration(0, 84, 298, 286)}
  </g>

  <!-- ==================== FOOTER STRIP (Bottom 56px) ==================== -->
  <g id="footer">
    <line x1="32" y1="970" x2="992" y2="970" stroke="${C.inkNavy}" stroke-width="1.5"/>
    
    <text x="32" y="996" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="9" font-weight="700" fill="${C.mutedSlate}" letter-spacing="1">VOL. CLXXVII NO. 48</text>
    <text x="512" y="996" text-anchor="middle" class="footer-text">SUNDAY, 22 NOVEMBER 2026 • FIVE REGIONS • GLOBAL DAILY DIGEST</text>
    <text x="992" y="996" text-anchor="end" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="9" font-weight="700" fill="${C.mutedSlate}" letter-spacing="1">HISTORICAL RECORD</text>
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
  // Using compressionLevel: 8 and adaptiveFiltering to land in the 200-450 KB sweet spot
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
