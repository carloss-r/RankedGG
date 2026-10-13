import type { LiftId, RankId, Sex } from "../types";

/** Lo que el cliente envía al servidor. El servidor recalcula todo a partir de esto. */
export type SubmitPayload = {
  playerId: string;
  secret: string;
  name: string;
  sex: Sex;
  bodyweightKg: number;
  /** Mejor 1RM estimado (kg) por ejercicio. Solo los ejercicios registrados. */
  bests: Record<LiftId, number>;
  catalogVersion: number;
};

/** Registro completo en el servidor (nunca se expone tal cual). */
export type PlayerRecord = {
  id: string;
  secretHash: string;
  name: string;
  sex: Sex;
  bodyweightKg: number;
  bests: Record<LiftId, number>;
  liftScores: Record<LiftId, number>;
  score: number;
  percentile: number;
  rankId: RankId;
  xp: number;
  level: number;
  createdAt: string;
  updatedAt: string;
};

/** Fila pública del ranking (sin peso corporal ni secretos). */
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
  lift?: LiftId;
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
};

export type SubmitResponse = {
  ok: true;
  me: LeaderboardEntry;
};

export type ApiError = { ok?: false; error: string; detail?: string };
