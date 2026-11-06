export type Sex = "male" | "female";

/** Los 8 ejercicios base: tienen tabla propia de estándares mundiales. */
export type CoreLiftId =
  | "squat"
  | "bench"
  | "deadlift"
  | "ohp"
  | "row"
  | "pullup"
  | "curl"
  | "tricep";

/**
 * Id de cualquier ejercicio: uno base ("squat"), uno del catálogo
 * ("incline_bench") o uno creado por el usuario ("custom:<uuid>").
 */
export type LiftId = string;

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

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "traps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "abs"
  | "neck"
  | "fullbody"
  | "cardio";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "smith"
  | "bodyweight"
  | "kettlebell"
  | "band"
  | "other";

/**
 * weight: carga × repeticiones.
 * bodyweight: repeticiones, con peso extra opcional.
 * timed: duración (se guarda en segundos dentro de `reps`).
 */
export type ExerciseKind = "weight" | "bodyweight" | "timed";

export type Exercise = {
  id: LiftId;
  name: string;
  group: MuscleGroup;
  equipment: Equipment;
  kind: ExerciseKind;
  /** Solo para kind "timed": pedir minutos en vez de segundos. */
  unit?: "min";
  /**
   * Cómo puntuarlo: sus niveles esperados son los de un ejercicio base
   * multiplicados por `factor`. Sin `ref` el ejercicio solo se registra.
   */
  ref?: { lift: CoreLiftId; factor: number };
  aliases?: string[];
  core?: boolean;
  custom?: boolean;
};

export type Profile = {
  name: string;
  sex: Sex;
  bodyweightKg: number;
  createdAt: string;
  updatedAt: string;
};

export type PinRecord = {
  salt: string;
  hash: string;
  iterations: number;
};

/** Cuenta local de este dispositivo. */
export type Account = {
  id: string;
  name: string;
  /** Nombre normalizado (sin acentos/mayúsculas) para unicidad. */
  nameKey: string;
  pin: PinRecord | null;
  failedAttempts: number;
  /** Epoch ms hasta el que el PIN está bloqueado. 0 = sin bloqueo. */
  lockedUntil: number;
  createdAt: string;
  lastLoginAt: string;
};

/** Sesión de inicio de sesión (quién está dentro de la app). */
export type AuthSession = {
  accountId: string;
  startedAt: string;
  lastActiveAt: string;
};

/** Sesión de entrenamiento: agrupa las series de un mismo día de gimnasio. */
export type WorkoutSession = {
  id: string;
  accountId: string;
  startedAt: string;
  endedAt: string | null;
  title?: string;
};

export type LiftEntry = {
  id: string;
  lift: LiftId;
  weightKg: number;
  reps: number;
  estimated1rm: number;
  date: string;
  accountId?: string;
  sessionId?: string;
};

export type Standing = {
  rank: Rank;
  nextRank: Rank | null;
  division: number | null;
  label: string;
  points: number;
  progress: number;
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
  standing: Standing;
};

export type RankSnapshot = {
  score: number;
  percentile: number;
  rank: Rank;
  nextRank: Rank | null;
  progressToNext: number;
  standing: Standing;
  lifts: LiftScore[];
};

/** Una serie que supera tu mejor marca de ese ejercicio. */
export type RecordEvent = {
  lift: LiftId;
  /** "first": primera marca del ejercicio; "pr": supera la anterior. */
  kind: "first" | "pr";
  previousKg: number;
  newKg: number;
  /** Rango del ejercicio antes/después (null si el ejercicio no puntúa). */
  exerciseBefore: Standing | null;
  exerciseAfter: Standing | null;
  generalBefore: Standing;
  generalAfter: Standing;
  exerciseRankUp: boolean;
  generalRankUp: boolean;
};
