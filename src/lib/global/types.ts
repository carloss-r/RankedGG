import type { RankId } from "../types";

/** Fila pública del ranking. `score` es el valor por el que se ordena (global o del ejercicio). */
export type LeaderboardEntry = {
  position: number;
  id: string;
  name: string;
  rankId: RankId;
  level: number;
  score: number;
  /** 1RM en kg cuando el ranking es por ejercicio. */
  oneRm?: number;
};

export type LeaderboardResponse = {
  /** undefined = ranking general. */
  lift?: string;
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
};

/** Forma exacta de lo que se guarda en players/{uid}. No incluye peso corporal ni sexo. */
export type PublishedPlayer = {
  name: string;
  rankId: RankId;
  level: number;
  xp: number;
  score: number;
  percentile: number;
  updatedAt: number;
  bests: Record<string, number>;
};

/** Forma exacta de lo que se guarda en lifts/{lift}/{uid}. */
export type PublishedLift = {
  name: string;
  rankId: RankId;
  level: number;
  score: number;
  oneRm: number;
};
