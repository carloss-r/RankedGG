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

/** Qué ranking se consulta: general, por grupo muscular, por ejercicio o por variante de un ejercicio. */
export type Scope =
  | { kind: "overall" }
  | { kind: "muscle"; id: string }
  | { kind: "lift"; id: string; variant?: string };

export type LeaderboardResponse = {
  scope: Scope;
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

/**
 * Forma exacta de lo que se guarda en lifts/{lift}/{uid} (oneRm = equivalente del ejercicio base)
 * y en variants/{lift}/{variant}/{uid} (oneRm = 1RM real de esa variante).
 */
export type PublishedLift = {
  name: string;
  rankId: RankId;
  level: number;
  score: number;
  oneRm: number;
};

/** Forma exacta de lo que se guarda en muscles/{muscle}/{uid}. */
export type PublishedMuscle = {
  name: string;
  rankId: RankId;
  level: number;
  score: number;
  /** Cuántos ejercicios de ese grupo tiene registrados. */
  lifts: number;
};
