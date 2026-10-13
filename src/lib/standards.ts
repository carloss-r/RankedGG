import { EXERCISES, LEVELS, LIFTS, standardsFor } from "./catalog";
import type { LiftId, Sex } from "./types";

/**
 * Las tablas de estándares (1RM en kg por peso corporal, de "sin entrenar" a
 * "clase mundial") viven ahora en src/data/exercises.json.
 */

export { LIFTS };

export const LEVEL_LABELS = LEVELS.labels;

export const LEVEL_PERCENTILES = LEVELS.percentiles;

export const LIFT_META: Record<LiftId, { name: string; short: string; weight: number }> =
  Object.fromEntries(
    EXERCISES.map((exercise) => [
      exercise.id,
      { name: exercise.name, short: exercise.short, weight: exercise.scoreWeight },
    ]),
  );

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function expectedLevels(sex: Sex, lift: LiftId, bodyweightKg: number) {
  const table = standardsFor(lift, sex);
  const bw = Math.max(table[0].bw, Math.min(table[table.length - 1].bw, bodyweightKg));

  let i = 0;
  while (i < table.length - 2 && table[i + 1].bw < bw) i += 1;

  const a = table[i];
  const b = table[i + 1];
  const t = (bw - a.bw) / (b.bw - a.bw || 1);

  return a.levels.map((value, index) => lerp(value, b.levels[index], t));
}

export function epley1rm(weightKg: number, reps: number) {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}
