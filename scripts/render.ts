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
  cardBorderLight: '#E5E0D4',
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
};

function renderCategoryPill(x: number, y: number, label: string, status: 'CONFIRMED' | 'OFFICIAL' | 'REPORTED'): string {
  const statusColors = {
    CONFIRMED: { bg: C.greenBg, text: '#FFFFFF' },
    OFFICIAL: { bg: C.crimson, text: '#FFFFFF' },
    REPORTED: { bg: C.charcoal, text: '#FFFFFF' },
  };

  const sc = statusColors[status] || statusColors.REPORTED;
  
  // Precise width map for labels
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

// Bespoke Flat-Editorial Illustrations

function renderClimateIllustration(x: number, y: number, w: number, h: number): string {
  return `
    <g transform="translate(${x}, ${y})">
      <!-- Background Card -->
      <rect width="${w}" height="${h}" rx="6" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
      
      <!-- Subtle Paper Grid Texture -->
      <g stroke="${C.cardBorderLight}" stroke-width="0.75" opacity="0.6">
        ${[40, 80, 120, 160, 200, 240, 280].map(py => `<line x1="8" y1="${py}" x2="${w - 8}" y2="${py}"/>`).join('')}
      </g>

      <!-- Coastal Mountain Silhouette -->
      <path d="M 12,${h - 45} L 110,${h - 105} L 190,${h - 75} L 270,${h - 120} L 360,${h - 60} L 460,${h - 100} L ${w - 12},${h - 45} Z" fill="#DDE4EA" opacity="0.75"/>
      <path d="M 270,${h - 120} L 285,${h - 100} L 255,${h - 100} Z" fill="#FFFFFF" opacity="0.9"/>
      <path d="M 110,${h - 105} L 122,${h - 88} L 98,${h - 88} Z" fill="#FFFFFF" opacity="0.9"/>

      <!-- Ambient Mediterranean Horizon & Water -->
      <line x1="12" y1="${h - 45}" x2="${w - 12}" y2="${h - 45}" stroke="${C.steelMid}" stroke-width="1.2"/>
      <rect x="12" y="${h - 44}" width="${w - 24}" height="32" fill="#D6E2E8" opacity="0.65"/>
      <line x1="20" y1="${h - 32}" x2="${w - 20}" y2="${h - 32}" stroke="${C.steelLight}" stroke-width="1" stroke-dasharray="6,4"/>
      <line x1="40" y1="${h - 22}" x2="${w - 30}" y2="${h - 22}" stroke="${C.steelLight}" stroke-width="1" stroke-dasharray="8,5"/>

      <!-- Stylized Globe (Top Right of Panel) -->
      <g transform="translate(415, 120)">
        <!-- Globe Backdrop Aura -->
        <circle cx="0" cy="0" r="82" fill="#E6EEF3" stroke="${C.steelMid}" stroke-width="2"/>
        
        <!-- Latitude Parallels -->
        <ellipse cx="0" cy="0" rx="82" ry="44" fill="none" stroke="${C.steelLight}" stroke-width="1.2" stroke-dasharray="3,3"/>
        <ellipse cx="0" cy="0" rx="82" ry="20" fill="none" stroke="${C.steelLight}" stroke-width="1.2"/>
        <line x1="-82" y1="0" x2="82" y2="0" stroke="${C.steelMid}" stroke-width="1.2"/>
        
        <!-- Longitude Meridians -->
        <ellipse cx="0" cy="0" rx="46" ry="82" fill="none" stroke="${C.steelLight}" stroke-width="1.2"/>
        <ellipse cx="0" cy="0" rx="20" ry="82" fill="none" stroke="${C.steelLight}" stroke-width="1.2"/>
        <line x1="0" y1="-82" x2="0" y2="82" stroke="${C.steelMid}" stroke-width="1.2"/>

        <!-- Mediterranean & Anatolian Vector Coastline -->
        <path d="M -35,-26 Q -15,-40 12,-24 Q 38,-14 44,10 Q 22,28 -8,14 Z" fill="${C.steelMid}" opacity="0.8"/>
        <path d="M -54,8 Q -34,4 -22,24 Q -44,36 -60,20 Z" fill="${C.steelDark}" opacity="0.55"/>
        
        <!-- Summit Marker at Antalya (Red Pin) -->
        <circle cx="14" cy="-8" r="4.5" fill="${C.crimson}"/>
        <circle cx="14" cy="-8" r="8" fill="none" stroke="${C.crimson}" stroke-width="1.2"/>
        <line x1="14" y1="-8" x2="32" y2="-22" stroke="${C.crimson}" stroke-width="1.2"/>
        <rect x="34" y="-30" width="48" height="15" rx="2" fill="${C.crimson}"/>
        <text x="58" y="-19.5" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="800" fill="#FFFFFF" letter-spacing="0.8">COP31</text>
      </g>

      <!-- Summit Modern Pavilion Architecture (Left Foreground) -->
      <!-- Plaza Base & Steps -->
      <polygon points="26,${h - 45} 275,${h - 45} 325,${h - 18} 8,${h - 18}" fill="${C.steelDark}"/>
      <line x1="18" y1="${h - 32}" x2="310" y2="${h - 32}" stroke="${C.steelLight}" stroke-width="1.2"/>

      <!-- Pavilion Cantilever Wings & Overhang -->
      <polygon points="40,${h - 155} 225,${h - 195} 255,${h - 135} 70,${h - 95}" fill="${C.steelDark}"/>
      <polygon points="55,${h - 162} 240,${h - 202} 252,${h - 186} 68,${h - 146}" fill="${C.steelMid}"/>
      
      <!-- Architectural Glass Facade & Vertical Structural Columns -->
      <polygon points="70,${h - 95} 255,${h - 135} 250,${h - 45} 65,${h - 45}" fill="#C8D7E0" opacity="0.75"/>
      <line x1="105" y1="${h - 102}" x2="100" y2="${h - 45}" stroke="${C.steelDark}" stroke-width="2.5"/>
      <line x1="145" y1="${h - 111}" x2="140" y2="${h - 45}" stroke="${C.steelDark}" stroke-width="2.5"/>
      <line x1="185" y1="${h - 120}" x2="180" y2="${h - 45}" stroke="${C.steelDark}" stroke-width="2.5"/>
      <line x1="225" y1="${h - 129}" x2="220" y2="${h - 45}" stroke="${C.steelDark}" stroke-width="2.5"/>
      
      <!-- Floor Convergence & Perspective Lines -->
      <line x1="65" y1="${h - 45}" x2="250" y2="${h - 45}" stroke="${C.inkNavy}" stroke-width="1.5"/>

      <!-- Summit Flags atop Roof -->
      <g>
        <line x1="50" y1="${h - 155}" x2="50" y2="${h - 200}" stroke="${C.inkNavy}" stroke-width="2"/>
        <polygon points="50,${h - 200} 72,${h - 192} 50,${h - 184}" fill="${C.crimson}"/>

        <line x1="115" y1="${h - 171}" x2="115" y2="${h - 212}" stroke="${C.inkNavy}" stroke-width="2"/>
        <polygon points="115,${h - 212} 137,${h - 204} 115,${h - 196}" fill="${C.steelMid}"/>

        <line x1="180" y1="${h - 185}" x2="180" y2="${h - 224}" stroke="${C.inkNavy}" stroke-width="2"/>
        <polygon points="180,${h - 224} 202,${h - 216} 180,${h - 208}" fill="${C.inkNavy}"/>
      </g>

      <!-- Solar & Renewable Transition Compass Motif -->
      <g transform="translate(488, 48)">
        <circle cx="0" cy="0" r="16" fill="none" stroke="${C.steelMid}" stroke-width="1.5"/>
        <circle cx="0" cy="0" r="6" fill="${C.steelMid}"/>
        <line x1="0" y1="-24" x2="0" y2="-18" stroke="${C.steelMid}" stroke-width="1.8"/>
        <line x1="0" y1="18" x2="0" y2="24" stroke="${C.steelMid}" stroke-width="1.8"/>
        <line x1="-24" y1="0" x2="-18" y2="0" stroke="${C.steelMid}" stroke-width="1.8"/>
        <line x1="18" y1="0" x2="24" y2="0" stroke="${C.steelMid}" stroke-width="1.8"/>
      </g>
    </g>
  `;
}

function renderMissileIllustration(x: number, y: number, w: number, h: number): string {
  return `
    <g transform="translate(${x}, ${y})">
      <!-- Background Card -->
      <rect width="${w}" height="${h}" rx="6" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
      
      <!-- Desert Terrain Silhouette -->
      <path d="M 12,${h - 28} Q 110,${h - 44} 200,${h - 32} T ${w - 12},${h - 34} L ${w - 12},${h - 12} L 12,${h - 12} Z" fill="#DDD7C7"/>
      
      <!-- Defensive Geodesic Radar Dome Battery -->
      <g transform="translate(68, ${h - 32})">
        <!-- Platform Foundation -->
        <rect x="-38" y="-8" width="76" height="8" fill="${C.steelDark}" rx="2"/>
        <!-- Geodesic Dome -->
        <path d="M -32,-8 A 32 32 0 0 1 32,-8 Z" fill="${C.steelDark}"/>
        <!-- Geodesic Lines -->
        <path d="M -24,-8 A 24 24 0 0 1 24,-8" fill="none" stroke="${C.steelMid}" stroke-width="1.4"/>
        <line x1="0" y1="-40" x2="0" y2="-8" stroke="${C.steelMid}" stroke-width="1.4"/>
        <line x1="-18" y1="-8" x2="-10" y2="-34" stroke="${C.steelMid}" stroke-width="1.2"/>
        <line x1="18" y1="-8" x2="10" y2="-34" stroke="${C.steelMid}" stroke-width="1.2"/>
        <!-- Radar Mast -->
        <line x1="44" y1="-8" x2="44" y2="-48" stroke="${C.inkNavy}" stroke-width="2"/>
        <line x1="36" y1="-40" x2="52" y2="-40" stroke="${C.inkNavy}" stroke-width="1.5"/>
        <line x1="38" y1="-30" x2="50" y2="-30" stroke="${C.inkNavy}" stroke-width="1.5"/>
        <circle cx="44" cy="-48" r="3" fill="${C.crimson}"/>
      </g>

      <!-- Spherical Radar Waves Radiating from Battery -->
      <path d="M 68,${h - 60} A 85 85 0 0 1 153,${h - 95}" fill="none" stroke="${C.steelLight}" stroke-width="1.5" stroke-dasharray="3,3"/>
      <path d="M 68,${h - 60} A 140 140 0 0 1 202,${h - 138}" fill="none" stroke="${C.steelLight}" stroke-width="1.5" stroke-dasharray="4,4"/>
      <path d="M 68,${h - 60} A 195 195 0 0 1 256,${h - 180}" fill="none" stroke="${C.steelLight}" stroke-width="1.5" stroke-dasharray="5,5"/>

      <!-- Incoming Missile Hostile Path (Dashed) -->
      <path d="M ${w - 24},32 Q ${w - 75},68 ${w - 126},98" fill="none" stroke="${C.inkNavy}" stroke-width="1.8" stroke-dasharray="5,3"/>
      
      <!-- Intercept Point & Kinetic Starburst -->
      <g transform="translate(${w - 132}, 104)">
        <!-- Aura -->
        <circle cx="0" cy="0" r="22" fill="${C.crimsonLight}" opacity="0.6"/>
        <circle cx="0" cy="0" r="12" fill="${C.crimson}" opacity="0.35"/>
        <circle cx="0" cy="0" r="5" fill="${C.crimson}"/>
        <!-- Kinetic Flash Rays -->
        <line x1="-16" y1="0" x2="16" y2="0" stroke="${C.crimson}" stroke-width="2.2"/>
        <line x1="0" y1="-16" x2="0" y2="16" stroke="${C.crimson}" stroke-width="2.2"/>
        <line x1="-12" y1="-12" x2="12" y2="12" stroke="${C.crimson}" stroke-width="1.8"/>
        <line x1="-12" y1="12" x2="12" y2="-12" stroke="${C.crimson}" stroke-width="1.8"/>
      </g>

      <!-- Crimson Interception Arc -->
      <path d="M 72,${h - 68} Q 130,42 ${w - 132},104" fill="none" stroke="${C.crimson}" stroke-width="3"/>

      <!-- Neutralized Missile Silhouette Deflected -->
      <g transform="translate(${w - 102}, 80) rotate(-46)">
        <polygon points="0,-20 6,2 3,16 -3,16 -6,2" fill="${C.inkNavy}"/>
        <polygon points="3,8 11,16 3,14" fill="${C.steelDark}"/>
        <polygon points="-3,8 -11,16 -3,14" fill="${C.steelDark}"/>
        <polygon points="0,-20 3,-8 -3,-8" fill="${C.crimson}"/>
      </g>
      
      <!-- Defensive Sector Badge -->
      <rect x="18" y="16" width="118" height="18" rx="3" fill="${C.steelDark}"/>
      <text x="77" y="28.5" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.5" font-weight="800" fill="#FFFFFF" letter-spacing="1">DEFENSE SECTOR</text>
    </g>
  `;
}

function renderServerIllustration(x: number, y: number, w: number, h: number): string {
  return `
    <g transform="translate(${x}, ${y})">
      <!-- Background Card -->
      <rect width="${w}" height="${h}" rx="6" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
      
      <!-- Enterprise Server Tower Chassis -->
      <g transform="translate(20, 20)">
        <!-- Outer Rack Frame -->
        <rect x="0" y="0" width="104" height="${h - 40}" rx="4" fill="${C.inkNavy}"/>
        <rect x="4" y="4" width="96" height="${h - 48}" rx="2" fill="${C.steelDark}"/>

        <!-- Rack Units (5 Server Blades) -->
        ${[0, 1, 2, 3, 4].map(i => {
          const sy = 8 + i * 35;
          return `
            <rect x="7" y="${sy}" width="90" height="29" rx="2" fill="${C.inkNavy}" stroke="${C.steelMid}" stroke-width="1"/>
            <!-- Ventilation Slits -->
            <line x1="13" y1="${sy + 9}" x2="48" y2="${sy + 9}" stroke="${C.steelMid}" stroke-width="1.2"/>
            <line x1="13" y1="${sy + 14}" x2="48" y2="${sy + 14}" stroke="${C.steelMid}" stroke-width="1.2"/>
            <line x1="13" y1="${sy + 19}" x2="48" y2="${sy + 19}" stroke="${C.steelMid}" stroke-width="1.2"/>
            <!-- LED Indicators -->
            <circle cx="58" cy="${sy + 14}" r="2.2" fill="${i === 1 || i === 3 ? C.crimson : '#10B981'}"/>
            <circle cx="66" cy="${sy + 14}" r="2.2" fill="${C.steelLight}"/>
            <circle cx="74" cy="${sy + 14}" r="2.2" fill="${C.steelMid}"/>
            <rect x="80" y="${sy + 10}" width="12" height="8" rx="1" fill="${C.steelMid}"/>
          `;
        }).join('')}
      </g>

      <!-- Fiber-Optic Bus & Semiconductor Circuit Topology -->
      <g transform="translate(132, 22)">
        <!-- Circuit Traces -->
        <path d="M 0,22 H 42 V 46 H 92" fill="none" stroke="${C.steelMid}" stroke-width="2"/>
        <path d="M 0,58 H 68 V 86 H 132" fill="none" stroke="${C.steelDark}" stroke-width="2"/>
        <path d="M 0,92 H 36 V 122 H 84 V 104 H 122" fill="none" stroke="${C.crimson}" stroke-width="2" stroke-dasharray="4,2"/>
        <path d="M 0,126 H 58 V 152 H 126" fill="none" stroke="${C.steelLight}" stroke-width="2"/>
        <path d="M 0,162 H 90 V 172 H 118" fill="none" stroke="${C.steelMid}" stroke-width="2"/>

        <!-- Nodes -->
        <circle cx="42" cy="46" r="4" fill="${C.steelDark}"/>
        <circle cx="92" cy="46" r="5" fill="${C.steelMid}"/>
        <circle cx="68" cy="86" r="4" fill="${C.steelDark}"/>
        <circle cx="132" cy="86" r="6" fill="${C.steelDark}"/>
        <circle cx="84" cy="104" r="4" fill="${C.crimson}"/>
        <circle cx="122" cy="104" r="5" fill="${C.crimson}"/>
        <circle cx="126" cy="152" r="5" fill="${C.steelMid}"/>
        
        <!-- Microchip Package -->
        <g transform="translate(86, 18)">
          <rect x="0" y="0" width="34" height="34" rx="3" fill="${C.steelDark}" stroke="${C.inkNavy}" stroke-width="1.5"/>
          <rect x="7" y="7" width="20" height="20" fill="${C.cardBg}"/>
          <circle cx="17" cy="17" r="4" fill="${C.crimson}"/>
        </g>
      </g>

      <!-- Regulatory Act Seal -->
      <g transform="translate(${w - 82}, ${h - 36})">
        <rect x="0" y="0" width="66" height="20" rx="3" fill="${C.crimson}"/>
        <text x="33" y="13.5" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8.5" font-weight="800" fill="#FFFFFF" letter-spacing="0.8">CURB ACT</text>
      </g>
    </g>
  `;
}

function renderRadarIllustration(x: number, y: number, w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2 + 6;
  const r = 82;

  return `
    <g transform="translate(${x}, ${y})">
      <!-- Background Card -->
      <rect width="${w}" height="${h}" rx="6" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>
      
      <!-- Scope Face -->
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#E4E0D4" stroke="${C.inkNavy}" stroke-width="3"/>
      
      <!-- Range Rings -->
      <circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="none" stroke="${C.steelLight}" stroke-width="1.2" stroke-dasharray="3,3"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.44}" fill="none" stroke="${C.steelLight}" stroke-width="1.2" stroke-dasharray="3,3"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 0.18}" fill="none" stroke="${C.steelLight}" stroke-width="1"/>

      <!-- Axes -->
      <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${C.steelMid}" stroke-width="1.2"/>
      <line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="${C.steelMid}" stroke-width="1.2"/>
      <line x1="${cx - r * 0.7}" y1="${cy - r * 0.7}" x2="${cx + r * 0.7}" y2="${cy + r * 0.7}" stroke="${C.steelLight}" stroke-width="0.8"/>
      <line x1="${cx - r * 0.7}" y1="${cy + r * 0.7}" x2="${cx + r * 0.7}" y2="${cy - r * 0.7}" stroke="${C.steelLight}" stroke-width="0.8"/>

      <!-- Rotating Sweep Sector Wedge -->
      <path d="M ${cx},${cy} L ${cx + r * 0.92},${cy - r * 0.38} A ${r} ${r} 0 0 0 ${cx + r * 0.6},${cy - r * 0.8} Z" fill="${C.steelMid}" opacity="0.32"/>

      <!-- Border Patrol Boundary Line -->
      <path d="M ${cx - 55},${cy - 75} Q ${cx - 15},${cy - 20} ${cx - 45},${cy + 70}" fill="none" stroke="${C.steelDark}" stroke-width="1.8" stroke-dasharray="5,3"/>

      <!-- Friendly Flight Track -->
      <circle cx="${cx - 32}" cy="${cy + 25}" r="3.5" fill="${C.steelDark}"/>
      <line x1="${cx - 32}" y1="${cy + 25}" x2="${cx - 22}" y2="${cy + 15}" stroke="${C.steelDark}" stroke-width="1.5"/>

      <!-- Incursion Alert Target Blip (Crimson) -->
      <g transform="translate(${cx + 42}, ${cy - 34})">
        <circle cx="0" cy="0" r="11" fill="none" stroke="${C.crimson}" stroke-width="1.2" stroke-dasharray="2,2"/>
        <circle cx="0" cy="0" r="5" fill="${C.crimson}"/>
        <!-- Vector Arrow -->
        <line x1="0" y1="0" x2="-22" y2="14" stroke="${C.crimson}" stroke-width="2"/>
        <polygon points="-22,14 -14,14 -19,8" fill="${C.crimson}"/>
        <!-- Target Tag -->
        <rect x="8" y="-14" width="46" height="13" rx="2" fill="${C.crimson}"/>
        <text x="31" y="-4.5" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="7.5" font-weight="800" fill="#FFFFFF" letter-spacing="0.5">TRK 084</text>
      </g>

      <!-- Readout Stats -->
      <text x="16" y="22" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.mutedSlate}" letter-spacing="1">RANGE: 300 KM</text>
      <text x="${w - 16}" y="22" text-anchor="end" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="8" font-weight="700" fill="${C.crimson}" letter-spacing="1">SCRAMBLE</text>
    </g>
  `;
}

function renderOceanIllustration(x: number, y: number, w: number, h: number): string {
  return `
    <g transform="translate(${x}, ${y})">
      <!-- Background Card -->
      <rect width="${w}" height="${h}" rx="6" fill="${C.cardBg}" stroke="${C.cardBorder}" stroke-width="1"/>

      <!-- Dusk Sky Horizon -->
      <rect x="1" y="1" width="${w - 2}" height="${h * 0.44}" fill="#E6E1D4" rx="5"/>
      <line x1="12" y1="${h * 0.44}" x2="${w - 12}" y2="${h * 0.44}" stroke="${C.cardBorder}" stroke-width="1"/>

      <!-- Distant Beacon Light Beam -->
      <polygon points="${w - 36},22 40,${h * 0.44} 80,${h * 0.44}" fill="#FFF8DC" opacity="0.45"/>
      <circle cx="${w - 36}" cy="22" r="3" fill="${C.crimson}"/>
      <line x1="${w - 36}" y1="22" x2="${w - 36}" y2="${h * 0.44}" stroke="${C.steelDark}" stroke-width="1.8"/>

      <!-- Solemn River Wave Silhouette Layer 1 (Back Swell) -->
      <path d="M 0,${h * 0.44} Q 60,${h * 0.38} 130,${h * 0.46} T 240,${h * 0.44} Q 275,${h * 0.48} ${w},${h * 0.42} L ${w},${h} L 0,${h} Z" fill="${C.steelLight}"/>
      <path d="M 0,${h * 0.44} Q 60,${h * 0.38} 130,${h * 0.46} T 240,${h * 0.44} Q 275,${h * 0.48} ${w},${h * 0.42}" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.6"/>

      <!-- Solemn River Wave Layer 2 (Mid Surge) -->
      <path d="M 0,${h * 0.58} Q 70,${h * 0.48} 150,${h * 0.60} T 270,${h * 0.56} L ${w},${h * 0.54} L ${w},${h} L 0,${h} Z" fill="${C.steelMid}"/>
      <path d="M 0,${h * 0.58} Q 70,${h * 0.48} 150,${h * 0.60} T 270,${h * 0.56} L ${w},${h * 0.54}" fill="none" stroke="#FFFFFF" stroke-width="1.8" opacity="0.8"/>

      <!-- Stylized Capsizing River Craft Silhouette -->
      <g transform="translate(130, ${h * 0.52}) rotate(26)">
        <path d="M -34,0 L 32,-4 L 38,10 L -30,8 Z" fill="${C.inkNavy}"/>
        <line x1="-18" y1="0" x2="-18" y2="-12" stroke="${C.inkNavy}" stroke-width="2"/>
        <line x1="0" y1="-2" x2="0" y2="-14" stroke="${C.inkNavy}" stroke-width="2"/>
        <line x1="18" y1="-3" x2="18" y2="-13" stroke="${C.inkNavy}" stroke-width="2"/>
        <line x1="-22" y1="-12" x2="22" y2="-14" stroke="${C.inkNavy}" stroke-width="2.5"/>
        <circle cx="36" cy="4" r="3" fill="#FFFFFF" opacity="0.9"/>
        <circle cx="44" cy="10" r="2.5" fill="#FFFFFF" opacity="0.8"/>
      </g>

      <!-- Solemn River Wave Layer 3 (Deep Foreground Water) -->
      <path d="M 0,${h * 0.74} Q 80,${h * 0.64} 170,${h * 0.76} T ${w},${h * 0.70} L ${w},${h} L 0,${h} Z" fill="${C.steelDark}"/>
      <path d="M 0,${h * 0.74} Q 80,${h * 0.64} 170,${h * 0.76} T ${w},${h * 0.70}" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.9"/>
      
      <!-- Solemn Lifebuoy Accent -->
      <circle cx="${w - 44}" cy="${h - 30}" r="9" fill="none" stroke="${C.crimson}" stroke-width="3"/>
      <circle cx="${w - 44}" cy="${h - 30}" r="4" fill="${C.steelDark}"/>
      <line x1="${w - 44}" y1="${h - 42}" x2="${w - 44}" y2="${h - 18}" stroke="#FFFFFF" stroke-width="1.2"/>
      <line x1="${w - 56}" y1="${h - 30}" x2="${w - 32}" y2="${h - 30}" stroke="#FFFFFF" stroke-width="1.2"/>
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
        font-size: 15px;
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
    <g transform="translate(762, 36)">
      <rect width="230" height="66" rx="6" fill="${C.crimson}"/>
      <text x="115" y="24" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="9.5" font-weight="800" fill="${C.crimsonLight}" letter-spacing="1.5">DAILY DIGEST</text>
      <text x="115" y="52" text-anchor="middle" font-family="'Segoe UI', -apple-system, Arial, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" letter-spacing="1.2">22 NOVEMBER 2026</text>
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

    <text x="0" y="38" class="panel-headline" font-size="23">${topRight.headline}</text>
    <text x="0" y="58" class="panel-sub">${topRight.subtitle.split(';')[0]};</text>
    <text x="0" y="74" class="panel-sub">${topRight.subtitle.split(';')[1]?.trim() || ''}</text>
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
