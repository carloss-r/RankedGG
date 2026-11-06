import type { Rank, RankId, Standing } from "./types";

export const RANKS: Rank[] = [
  {
    id: "wood",
    name: "Madera",
    subtitle: "El primer disco",
    minScore: 0,
    color: "#c4a574",
    glow: "rgba(196,165,116,0.45)",
    icon: "🪵",
  },
  {
    id: "stone",
    name: "Piedra",
    subtitle: "Constancia cruda",
    minScore: 8,
    color: "#9aa3b2",
    glow: "rgba(154,163,178,0.4)",
    icon: "🪨",
  },
  {
    id: "iron",
    name: "Hierro",
    subtitle: "La barra ya pesa",
    minScore: 16,
    color: "#7d8899",
    glow: "rgba(125,136,153,0.4)",
    icon: "⛓️",
  },
  {
    id: "bronze",
    name: "Bronce",
    subtitle: "Más fuerte que el 20%",
    minScore: 24,
    color: "#d08a45",
    glow: "rgba(208,138,69,0.5)",
    icon: "🥉",
  },
  {
    id: "silver",
    name: "Plata",
    subtitle: "Técnica y kilos",
    minScore: 34,
    color: "#d7dee8",
    glow: "rgba(215,222,232,0.45)",
    icon: "🥈",
  },
  {
    id: "gold",
    name: "Oro",
    subtitle: "Nivel gimnasio sólido",
    minScore: 44,
    color: "#f3c14b",
    glow: "rgba(243,193,75,0.55)",
    icon: "🥇",
  },
  {
    id: "platinum",
    name: "Platino",
    subtitle: "Por encima de la media",
    minScore: 54,
    color: "#b9c7d6",
    glow: "rgba(185,199,214,0.5)",
    icon: "💿",
  },
  {
    id: "sapphire",
    name: "Zafiro",
    subtitle: "Fuerza avanzada",
    minScore: 62,
    color: "#4f8cff",
    glow: "rgba(79,140,255,0.5)",
    icon: "💠",
  },
  {
    id: "emerald",
    name: "Esmeralda",
    subtitle: "Top del gimnasio",
    minScore: 70,
    color: "#34d399",
    glow: "rgba(52,211,153,0.5)",
    icon: "💚",
  },
  {
    id: "diamond",
    name: "Diamante",
    subtitle: "Élite local",
    minScore: 78,
    color: "#7dd3fc",
    glow: "rgba(125,211,252,0.55)",
    icon: "💎",
  },
  {
    id: "master",
    name: "Maestro",
    subtitle: "Top mundial amateur",
    minScore: 85,
    color: "#c4b5fd",
    glow: "rgba(196,181,253,0.55)",
    icon: "⚔️",
  },
  {
    id: "champion",
    name: "Campeón",
    subtitle: "Nivel competitivo",
    minScore: 91,
    color: "#fb7185",
    glow: "rgba(251,113,133,0.5)",
    icon: "🏆",
  },
  {
    id: "titan",
    name: "Titán",
    subtitle: "Casi élite mundial",
    minScore: 95,
    color: "#fb923c",
    glow: "rgba(251,146,60,0.55)",
    icon: "🛡️",
  },
  {
    id: "olympia",
    name: "Mr Olympia",
    subtitle: "Cima absoluta",
    minScore: 98,
    color: "#ffe08a",
    glow: "rgba(255,224,138,0.7)",
    icon: "👑",
  },
];

export function rankById(id: RankId): Rank {
  return RANKS.find((rank) => rank.id === id) ?? RANKS[0];
}

export function rankFromScore(score: number): Rank {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (score >= rank.minScore) current = rank;
  }
  return current;
}

export function nextRankFromScore(score: number): Rank | null {
  const current = rankFromScore(score);
  const index = RANKS.findIndex((rank) => rank.id === current.id);
  return RANKS[index + 1] ?? null;
}

/** Divisiones por rango, como en un competitivo: III (la más baja) → I. */
export const DIVISIONS = 3;
const ROMAN = ["", "I", "II", "III"];

/** Puntuación mínima para compartir: 0 = se puede compartir desde Madera. */
export const SHARE_MIN_SCORE = 0;

export function standingFromScore(score: number): Standing {
  const safe = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  const rank = rankFromScore(safe);
  const nextRank = nextRankFromScore(safe);
  if (!nextRank) {
    const span = 100 - rank.minScore || 1;
    return {
      rank,
      nextRank: null,
      division: null,
      label: rank.name,
      points: Math.min(99, Math.floor(((safe - rank.minScore) / span) * 100)),
      progress: 1,
    };
  }
  const span = nextRank.minScore - rank.minScore;
  const step = span / DIVISIONS;
  const into = safe - rank.minScore;
  const index = Math.min(DIVISIONS - 1, Math.floor(into / step));
  const division = DIVISIONS - index;
  return {
    rank,
    nextRank,
    division,
    label: `${rank.name} ${ROMAN[division]}`,
    points: Math.min(99, Math.floor(((into - index * step) / step) * 100)),
    progress: Math.min(1, into / span),
  };
}
