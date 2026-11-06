import type { RankId } from "./types";

/**
 * Emblemas de rango en SVG. Se usan en la app (dangerouslySetInnerHTML con
 * contenido propio, sin datos del usuario) y se dibujan en el PNG para compartir.
 */

type Palette = {
  hi: string;
  mid: string;
  lo: string;
  rim: string;
  accent: string;
  gemHi: string;
  gemLo: string;
};

const PALETTES: Record<RankId, Palette> = {
  wood: { hi: "#e0bd8a", mid: "#a8793f", lo: "#5e3a1c", rim: "#3d2410", accent: "#f2d9a8", gemHi: "#e0bd8a", gemLo: "#5e3a1c" },
  stone: { hi: "#cfd5de", mid: "#8b94a3", lo: "#4b5361", rim: "#2c323d", accent: "#e8ecf2", gemHi: "#cfd5de", gemLo: "#4b5361" },
  iron: { hi: "#b9c2d0", mid: "#6b7688", lo: "#2f3744", rim: "#171c25", accent: "#dbe3ee", gemHi: "#b9c2d0", gemLo: "#2f3744" },
  bronze: { hi: "#f3b878", mid: "#c9772f", lo: "#6d3510", rim: "#3f1d08", accent: "#ffd9ad", gemHi: "#ffd9ad", gemLo: "#a85a1c" },
  silver: { hi: "#fbfdff", mid: "#c3ccd9", lo: "#6c7889", rim: "#3a4352", accent: "#ffffff", gemHi: "#ffffff", gemLo: "#9aa8bb" },
  gold: { hi: "#fff1b0", mid: "#f0b72f", lo: "#9a6208", rim: "#5a3504", accent: "#fff8d6", gemHi: "#fff1b0", gemLo: "#d99a14" },
  platinum: { hi: "#f4f8fc", mid: "#b5c5d8", lo: "#6a7d94", rim: "#36455a", accent: "#ffffff", gemHi: "#ffffff", gemLo: "#8fb0d4" },
  sapphire: { hi: "#b9d3ff", mid: "#4f8cff", lo: "#1a3f9c", rim: "#0e2362", accent: "#e1edff", gemHi: "#9cc4ff", gemLo: "#1f4fd1" },
  emerald: { hi: "#a8f5cf", mid: "#2fc68a", lo: "#0b6a49", rim: "#053a29", accent: "#d8fbea", gemHi: "#8ff0c4", gemLo: "#0d8a5c" },
  diamond: { hi: "#f0fbff", mid: "#7dd3fc", lo: "#2d86b8", rim: "#124a6b", accent: "#ffffff", gemHi: "#ffffff", gemLo: "#5cc2f5" },
  master: { hi: "#e3d9ff", mid: "#9a82f2", lo: "#46309e", rim: "#241766", accent: "#f1ecff", gemHi: "#d4c6ff", gemLo: "#6b4fe0" },
  champion: { hi: "#ffc4cc", mid: "#ee4a62", lo: "#8a1428", rim: "#4d0a16", accent: "#ffe3e7", gemHi: "#ffb3be", gemLo: "#c4213b" },
  titan: { hi: "#ffd5a1", mid: "#fb8a2b", lo: "#a33e06", rim: "#5c2203", accent: "#fff0dc", gemHi: "#ffc88a", gemLo: "#e0620f" },
  olympia: { hi: "#fffbe0", mid: "#ffd23f", lo: "#b87a05", rim: "#6b4300", accent: "#ffffff", gemHi: "#fffbe0", gemLo: "#f2b01c" },
};

const SHIELD = "M60 8 L102 20 V58 C102 86 82 104 60 114 C38 104 18 86 18 58 V20 Z";
const SHIELD_INNER = "M60 18 L93 27.5 V58 C93 80 77 95 60 103 C43 95 27 80 27 58 V27.5 Z";

const r1 = (n: number) => Math.round(n * 10) / 10;

function star(cx: number, cy: number, outer: number, inner: number, fill: string) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${r1(cx + radius * Math.cos(angle))},${r1(cy + radius * Math.sin(angle))}`);
  }
  return `<polygon points="${pts.join(" ")}" fill="${fill}" stroke="rgba(0,0,0,.25)" stroke-width=".8" stroke-linejoin="round"/>`;
}

function sparkle(cx: number, cy: number, size: number, fill = "#fff") {
  const s = size;
  const t = size * 0.22;
  return `<path d="M${cx} ${cy - s} Q${cx + t} ${cy - t} ${cx + s} ${cy} Q${cx + t} ${cy + t} ${cx} ${cy + s} Q${cx - t} ${cy + t} ${cx - s} ${cy} Q${cx - t} ${cy - t} ${cx} ${cy - s}Z" fill="${fill}"/>`;
}

function chevrons(count: number, id: string, startY: number) {
  let out = "";
  for (let i = 0; i < count; i += 1) {
    const y = startY + i * 13;
    out += `<path d="M36 ${y} L60 ${y + 13} L84 ${y} V${y + 8} L60 ${y + 21} L36 ${y + 8} Z" fill="url(#${id}-light)" stroke="${"rgba(0,0,0,.35)"}" stroke-width=".9" stroke-linejoin="round"/>`;
  }
  return out;
}

function wings(id: string) {
  const feathers = [
    "M98 34 C108 30 121 22 129 4 C118 7 108 14 100 24 Z",
    "M100 46 C113 44 127 36 136 20 C123 21 111 28 100 38 Z",
    "M100 58 C115 58 129 52 138 38 C125 37 112 43 100 49 Z",
    "M98 70 C111 72 123 68 129 57 C118 55 108 60 98 62 Z",
  ];
  const side = feathers
    .map(
      (d) =>
        `<path d="${d}" fill="url(#${id}-light)" stroke="rgba(0,0,0,.4)" stroke-width="1" stroke-linejoin="round"/>`,
    )
    .join("");
  return `<g>${side}</g><g transform="translate(120 0) scale(-1 1)">${side}</g>`;
}

function crown(id: string, y: number, g = `${id}-light`) {
  return `<g transform="translate(0 ${y})">
    <path d="M36 34 L40 10 L52 24 L60 4 L68 24 L80 10 L84 34 Z" fill="url(#${g})" stroke="rgba(0,0,0,.45)" stroke-width="1.2" stroke-linejoin="round"/>
    <rect x="35" y="33" width="50" height="9" rx="3" fill="url(#${g})" stroke="rgba(0,0,0,.45)" stroke-width="1.2"/>
    <circle cx="60" cy="38" r="2.6" fill="url(#${id}-gem)"/>
    <circle cx="46" cy="38" r="2" fill="url(#${id}-gem)"/>
    <circle cx="74" cy="38" r="2" fill="url(#${id}-gem)"/>
    <circle cx="40" cy="10" r="2.4" fill="url(#${id}-gem)"/>
    <circle cx="80" cy="10" r="2.4" fill="url(#${id}-gem)"/>
    <circle cx="60" cy="4" r="2.8" fill="url(#${id}-gem)"/>
  </g>`;
}

function laurel(id: string, cx: number, cy: number, radius: number, fill = `url(#${id}-light)`) {
  let leaves = "";
  for (let i = 0; i < 8; i += 1) {
    const t = i / 7;
    const angle = (112 + t * 118) * (Math.PI / 180);
    const lx = r1(cx + radius * Math.cos(angle));
    const ly = r1(cy + radius * Math.sin(angle));
    const rot = (angle * 180) / Math.PI + 90;
    leaves += `<ellipse cx="${lx}" cy="${ly}" rx="3.4" ry="8.5" transform="rotate(${r1(rot)} ${lx} ${ly})" fill="${fill}" stroke="rgba(0,0,0,.4)" stroke-width=".8"/>`;
  }
  return `<g>${leaves}</g><g transform="translate(${cx * 2} 0) scale(-1 1)">${leaves}</g>`;
}

function flames(id: string) {
  const tongue = (x: number, y: number, scale: number, rot: number) =>
    `<path d="M0 0 C-9 -12 -4 -20 -1 -34 C6 -22 11 -12 0 0Z" transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})" fill="url(#${id}-flame)" stroke="rgba(120,30,0,.5)" stroke-width="1"/>`;
  const left = [
    tongue(24, 92, 1.1, -24),
    tongue(16, 70, 1.25, -34),
    tongue(14, 46, 1.3, -40),
    tongue(22, 24, 1.15, -34),
  ].join("");
  const right = [
    tongue(96, 92, 1.1, 24),
    tongue(104, 70, 1.25, 34),
    tongue(106, 46, 1.3, 40),
    tongue(98, 24, 1.15, 34),
  ].join("");
  return left + right;
}

function rays(id: string) {
  let out = "";
  for (let i = 0; i < 16; i += 1) {
    const a = (i * Math.PI * 2) / 16;
    const half = Math.PI / 40;
    const r0 = 30;
    const r1o = i % 2 === 0 ? 66 : 54;
    const p = (rad: number, ang: number) => `${r1(60 + rad * Math.cos(ang))},${r1(60 + rad * Math.sin(ang))}`;
    out += `<polygon points="${p(r0, a - half)} ${p(r1o, a)} ${p(r0, a + half)}" fill="url(#${id}-ray)"/>`;
  }
  return out;
}

function swords(id: string) {
  const blade = `<g>
    <path d="M56 -24 L64 -24 L65.5 84 L54.5 84 Z" fill="url(#${id}-light)" stroke="rgba(0,0,0,.5)" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M60 -22 V84" stroke="rgba(0,0,0,.2)" stroke-width="1.2"/>
    <rect x="45" y="84" width="30" height="6" rx="3" fill="url(#${id}-gold)" stroke="rgba(0,0,0,.55)" stroke-width="1.1"/>
    <rect x="56.5" y="90" width="7" height="15" rx="2" fill="url(#${id}-body)" stroke="rgba(0,0,0,.55)" stroke-width="1.1"/>
    <circle cx="60" cy="108" r="4.5" fill="url(#${id}-gold)" stroke="rgba(0,0,0,.55)" stroke-width="1.1"/>
  </g>`;
  return `<g transform="rotate(46 60 60)">${blade}</g><g transform="rotate(-46 60 60)">${blade}</g>`;
}

function gemDiamond(id: string, cy: number, scale: number) {
  return `<g transform="translate(60 ${cy}) scale(${scale}) translate(-60 -60)">
    <path d="M40 48 L50 36 H70 L80 48 L60 84 Z" fill="url(#${id}-gem)" stroke="rgba(0,0,0,.5)" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M50 36 L56 48 L60 36 L64 48 L70 36" fill="rgba(255,255,255,.28)"/>
    <path d="M40 48 H80 M50 36 L56 48 L60 84 M70 36 L64 48 L60 84 M60 36 L56 48 M60 36 L64 48" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1" stroke-linejoin="round"/>
    <path d="M40 48 L50 36 L56 48Z" fill="rgba(255,255,255,.35)"/>
    <path d="M60 84 L56 48 H40Z" fill="rgba(0,0,0,.14)"/>
  </g>`;
}

function gemOctagon(id: string, cy: number, scale: number) {
  return `<g transform="translate(60 ${cy}) scale(${scale}) translate(-60 -58)">
    <path d="M48 38 H72 L82 48 V68 L72 78 H48 L38 68 V48 Z" fill="url(#${id}-gem)" stroke="rgba(0,0,0,.5)" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M52 44 H68 L74 50 V66 L68 72 H52 L46 66 V50 Z" fill="rgba(255,255,255,.18)" stroke="rgba(255,255,255,.55)" stroke-width="1"/>
    <path d="M48 38 L52 44 M72 38 L68 44 M82 48 L74 50 M82 68 L74 66 M72 78 L68 72 M48 78 L52 72 M38 68 L46 66 M38 48 L46 50" stroke="rgba(255,255,255,.5)" stroke-width="1"/>
    <path d="M48 38 H72 L68 44 H52Z" fill="rgba(255,255,255,.3)"/>
  </g>`;
}

function gemRound(id: string, cy: number, r: number) {
  return `<circle cx="60" cy="${cy}" r="${r}" fill="url(#${id}-gem)" stroke="rgba(0,0,0,.45)" stroke-width="1.4"/>
    <circle cx="60" cy="${cy}" r="${r * 0.62}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1"/>
    <ellipse cx="${60 - r * 0.3}" cy="${cy - r * 0.35}" rx="${r * 0.3}" ry="${r * 0.18}" fill="rgba(255,255,255,.7)"/>`;
}

function plate(id: string) {
  return `<path d="${SHIELD}" fill="url(#${id}-rim)" stroke="${"rgba(0,0,0,.55)"}" stroke-width="2" stroke-linejoin="round"/>
    <path d="${SHIELD_INNER}" fill="url(#${id}-body)" stroke="rgba(0,0,0,.35)" stroke-width="1.2" stroke-linejoin="round"/>
    <clipPath id="${id}-clip"><path d="${SHIELD_INNER}"/></clipPath>
    <g clip-path="url(#${id}-clip)"><path d="M20 10 L100 10 V50 C75 40 45 40 20 50Z" fill="rgba(255,255,255,.2)"/></g>`;
}

function woodLog(id: string) {
  let rings = "";
  for (const radius of [38, 30, 22, 14]) {
    rings += `<circle cx="60" cy="60" r="${radius}" fill="none" stroke="rgba(60,30,10,.5)" stroke-width="1.6"/>`;
  }
  return `<circle cx="60" cy="60" r="52" fill="url(#${id}-rim)" stroke="rgba(0,0,0,.55)" stroke-width="2"/>
    <circle cx="60" cy="60" r="46" fill="url(#${id}-body)" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/>
    ${rings}
    <path d="M60 60 L88 52 M60 60 L34 78" stroke="rgba(60,30,10,.45)" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="60" cy="60" r="5" fill="rgba(60,30,10,.6)"/>
    <path d="M24 44 A40 40 0 0 1 60 20" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3" stroke-linecap="round"/>`;
}

function stoneHex(id: string) {
  return `<polygon points="60,6 102,28 106,82 60,114 14,82 18,28" fill="url(#${id}-rim)" stroke="rgba(0,0,0,.55)" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="60,16 94,34 97,78 60,103 23,78 26,34" fill="url(#${id}-body)" stroke="rgba(0,0,0,.3)" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M26 34 L60 16 L94 34 L60 52Z" fill="rgba(255,255,255,.22)"/>
    <path d="M60 52 L58 70 L48 82 M58 70 L72 78 L74 94 M72 40 L80 56" fill="none" stroke="rgba(30,35,45,.6)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="40" cy="62" r="3" fill="rgba(255,255,255,.18)"/><circle cx="82" cy="70" r="2.4" fill="rgba(0,0,0,.2)"/>`;
}

function ironPlate(id: string) {
  const rivet = (x: number, y: number) =>
    `<circle cx="${x}" cy="${y}" r="3.4" fill="url(#${id}-light)" stroke="rgba(0,0,0,.6)" stroke-width="1"/>`;
  return `${plate(id)}
    <path d="M60 24 V98 M30 50 H90" stroke="rgba(0,0,0,.4)" stroke-width="6" stroke-linecap="round"/>
    <path d="M60 24 V98 M30 50 H90" stroke="url(#${id}-light)" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
    ${rivet(36, 34)}${rivet(84, 34)}${rivet(36, 66)}${rivet(84, 66)}${rivet(60, 92)}`;
}

function build(rankId: RankId): { viewBox: string; body: string; defs: string } {
  const P = PALETTES[rankId];
  const id = `rb-${rankId}`;
  const defs = `
    <linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.hi}"/><stop offset=".5" stop-color="${P.mid}"/><stop offset="1" stop-color="${P.lo}"/></linearGradient>
    <linearGradient id="${id}-rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.mid}"/><stop offset=".5" stop-color="${P.lo}"/><stop offset="1" stop-color="${P.rim}"/></linearGradient>
    <linearGradient id="${id}-light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.accent}"/><stop offset=".55" stop-color="${P.hi}"/><stop offset="1" stop-color="${P.mid}"/></linearGradient>
    <radialGradient id="${id}-gem" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${P.gemHi}"/><stop offset="1" stop-color="${P.gemLo}"/></radialGradient>
    <linearGradient id="${id}-flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff5a1f"/><stop offset=".6" stop-color="#ffb02e"/><stop offset="1" stop-color="#fff2a8"/></linearGradient>
    <linearGradient id="${id}-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c2"/><stop offset=".5" stop-color="#f6c342"/><stop offset="1" stop-color="#b9780a"/></linearGradient>
    <radialGradient id="${id}-ray" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${P.hi}" stop-opacity=".95"/><stop offset="1" stop-color="${P.mid}" stop-opacity=".1"/></radialGradient>`;

  const narrow = "0 -4 120 128";
  const winged = "-22 -4 164 128";
  const tall = "0 -22 120 146";
  const tallWinged = "-22 -22 164 146";

  switch (rankId) {
    case "wood":
      return { viewBox: narrow, defs, body: woodLog(id) };
    case "stone":
      return { viewBox: narrow, defs, body: stoneHex(id) };
    case "iron":
      return { viewBox: narrow, defs, body: ironPlate(id) };
    case "bronze":
      return {
        viewBox: narrow,
        defs,
        body: `${plate(id)}${chevrons(1, id, 54)}${star(60, 40, 9, 3.8, `url(#${id}-light)`)}`,
      };
    case "silver":
      return {
        viewBox: narrow,
        defs,
        body: `${plate(id)}${chevrons(2, id, 46)}${star(60, 34, 9, 3.8, `url(#${id}-light)`)}`,
      };
    case "gold":
      return {
        viewBox: narrow,
        defs,
        body: `${plate(id)}${chevrons(3, id, 40)}${star(60, 30, 8, 3.4, `url(#${id}-light)`)}${star(42, 33, 4.5, 2, `url(#${id}-light)`)}${star(78, 33, 4.5, 2, `url(#${id}-light)`)}`,
      };
    case "platinum":
      return {
        viewBox: winged,
        defs,
        body: `${wings(id)}${plate(id)}${gemRound(id, 58, 17)}${sparkle(84, 36, 5, P.accent)}`,
      };
    case "sapphire":
      return {
        viewBox: winged,
        defs,
        body: `${wings(id)}${plate(id)}${gemDiamond(id, 58, 1)}${sparkle(84, 34, 5, P.accent)}${sparkle(36, 78, 3.5, P.accent)}`,
      };
    case "emerald":
      return {
        viewBox: winged,
        defs,
        body: `${wings(id)}${plate(id)}${gemOctagon(id, 58, 1.05)}${sparkle(84, 34, 5, P.accent)}${sparkle(36, 80, 3.5, P.accent)}`,
      };
    case "diamond":
      return {
        viewBox: winged,
        defs,
        body: `${wings(id)}${plate(id)}${gemDiamond(id, 58, 1.2)}${sparkle(88, 30, 7, "#fff")}${sparkle(30, 44, 4.5, "#fff")}${sparkle(38, 88, 4, "#fff")}`,
      };
    case "master":
      return {
        viewBox: "-24 -22 168 150",
        defs,
        body: `${swords(id)}${plate(id)}${gemDiamond(id, 58, 1.05)}${star(60, 24, 6, 2.6, `url(#${id}-light)`)}`,
      };
    case "champion":
      return {
        viewBox: tall,
        defs,
        body: `${laurel(id, 60, 62, 56, `url(#${id}-gold)`)}${plate(id)}${gemDiamond(id, 64, 1)}${crown(id, -22, `${id}-gold`)}`,
      };
    case "titan":
      return {
        viewBox: tallWinged,
        defs,
        body: `${flames(id)}${wings(id)}${plate(id)}${gemOctagon(id, 58, 1.05)}${star(60, 26, 7, 3, `url(#${id}-light)`)}${sparkle(88, 32, 6, "#fff")}`,
      };
    case "olympia":
      return {
        viewBox: tallWinged,
        defs,
        body: `${rays(id)}${laurel(id, 60, 64, 58)}${wings(id)}${plate(id)}${gemDiamond(id, 66, 1.1)}${crown(id, -22)}${sparkle(100, 14, 7, "#fff")}${sparkle(20, 24, 5, "#fff")}${sparkle(104, 96, 5, "#fff")}${sparkle(16, 92, 4, "#fff")}`,
      };
  }
}

/** SVG completo del emblema de un rango. */
export function rankBadgeSvg(rankId: RankId): string {
  const { viewBox, body, defs } = build(rankId);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"><defs>${defs}</defs>${body}</svg>`;
}

/** SVG con tamaño en píxeles, listo para convertirse en imagen. */
export function rankBadgeDataUrl(rankId: RankId, px = 512): string {
  const svg = rankBadgeSvg(rankId)
    .replace('width="100%"', `width="${px}"`)
    .replace('height="100%"', `height="${px}"`);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Carga el emblema como imagen para dibujarlo en un canvas. */
export async function loadBadgeImage(rankId: RankId, px = 512): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  img.src = rankBadgeDataUrl(rankId, px);
  await img.decode();
  return img;
}
