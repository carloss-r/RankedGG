export type Sex = "male" | "female";

export type LiftId = "squat" | "bench" | "deadlift" | "ohp";

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
