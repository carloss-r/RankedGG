import { EXERCISES, RPG } from "./catalog";
import type { LiftScore, RpgStatId } from "./types";

export type RpgSheet = {
  xp: number;
  level: number;
  /** Progreso (0-1) hacia el siguiente nivel. */
  levelProgress: number;
  /** Atributos 0-100: promedio ponderado del score de los ejercicios que aportan a cada stat. */
  stats: Record<RpgStatId, number>;
};

/** Experiencia total = Σ score × xpMultiplier × perScorePoint (solo ejercicios registrados). */
export function xpFromLifts(lifts: LiftScore[]) {
  let xp = 0;
  for (const exercise of EXERCISES) {
    const lift = lifts.find((item) => item.lift === exercise.id);
    if (!lift || lift.oneRm <= 0) continue;
    xp += lift.score * exercise.xpMultiplier * RPG.xp.perScorePoint;
  }
  return Math.round(xp);
}

/** Nivel = 1 + floor(sqrt(xp / levelDivisor)). */
export function levelFromXp(xp: number) {
  const d = RPG.xp.levelDivisor;
  const level = 1 + Math.floor(Math.sqrt(Math.max(0, xp) / d));
  const floorXp = (level - 1) ** 2 * d;
  const ceilXp = level ** 2 * d;
  return { level, progress: (xp - floorXp) / (ceilXp - floorXp || 1) };
}

export function computeRpgSheet(lifts: LiftScore[]): RpgSheet {
  const xp = xpFromLifts(lifts);
  const { level, progress } = levelFromXp(xp);

  const acc: Record<RpgStatId, { sum: number; weight: number }> = {};
  for (const key of Object.keys(RPG.stats)) acc[key] = { sum: 0, weight: 0 };

  for (const exercise of EXERCISES) {
    const lift = lifts.find((item) => item.lift === exercise.id);
    if (!lift || lift.oneRm <= 0 || !acc[exercise.stat]) continue;
    acc[exercise.stat].sum += lift.score * exercise.scoreWeight;
    acc[exercise.stat].weight += exercise.scoreWeight;
  }

  const stats: Record<RpgStatId, number> = {};
  for (const [key, value] of Object.entries(acc)) {
    stats[key] = value.weight > 0 ? Math.round(value.sum / value.weight) : 0;
  }

  return { xp, level, levelProgress: progress, stats };
}
