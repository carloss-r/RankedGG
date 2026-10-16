export type Sex = "male" | "female";

/** Id de ejercicio. Los ids válidos salen de src/data/exercises.json. */
export type LiftId = string;

export type RpgStatId = string;

export type BwRow = { bw: number; levels: number[] };

export type MuscleId = string;

export type MuscleDef = { name: string };

export type VariantDef = {
  id: string;
  name: string;
  /** 1RM de la variante ÷ 1RM del ejercicio base (aprox.). La primera variante es la base (1). */
  factor: number;
  /** Aclaración de carga, p. ej. "Peso por mancuerna". */
  note?: string;
};

export type ExerciseDef = {
  id: LiftId;
  name: string;
  short: string;
  category: "compound" | "isolation" | "bodyweight";
  pattern: string;
  /** Grupo muscular principal (clave de `muscles` en el JSON). */
  muscle: MuscleId;
  variants: VariantDef[];
  /** Atributo RPG al que aporta (STR, VIT, AGI...). */
  stat: RpgStatId;
  /** Peso del ejercicio dentro del score global (0-1). */
  scoreWeight: number;
  /** Multiplicador de experiencia (XP) por punto de score. */
  xpMultiplier: number;
  unit: "kg";
  standards: Record<Sex, BwRow[]>;
};

export type RpgConfig = {
  stats: Record<RpgStatId, { name: string; description: string }>;
  xp: { perScorePoint: number; levelDivisor: number };
};

export type RankId =
  | "wood"
  | "stone"
  | "iron"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "sapphire"
  | "emerald"
  | "diamond"
  | "master"
  | "champion"
  | "titan"
  | "olympia";

export type Profile = {
  name: string;
  sex: Sex;
  bodyweightKg: number;
  createdAt: string;
  updatedAt: string;
};

export type LiftEntry = {
  id: string;
  lift: LiftId;
  /** Variante del ejercicio. Si falta (marcas antiguas) se usa la base. */
  variantId?: string;
  weightKg: number;
  reps: number;
  estimated1rm: number;
  date: string;
};

export type Rank = {
  id: RankId;
  name: string;
  subtitle: string;
  minScore: number;
  color: string;
  glow: string;
  icon: string;
};

export type LiftScore = {
  lift: LiftId;
  oneRm: number;
  score: number;
  percentile: number;
  levelLabel: string;
  nextKg: number | null;
};

export type RankSnapshot = {
  score: number;
  percentile: number;
  rank: Rank;
  nextRank: Rank | null;
  progressToNext: number;
  lifts: LiftScore[];
};
