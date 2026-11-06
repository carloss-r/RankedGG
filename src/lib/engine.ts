import { nextRankFromScore, RANKS, rankFromScore, standingFromScore } from "./ranks";
import {
  expectedLevels,
  LEVEL_LABELS,
  LEVEL_PERCENTILES,
  LIFT_META,
  LIFTS,
} from "./standards";
import type {
  CoreLiftId,
  Exercise,
  LiftEntry,
  LiftId,
  LiftScore,
  Profile,
  RankSnapshot,
  RecordEvent,
  Sex,
  Standing,
} from "./types";

export type ExerciseResolver = (id: LiftId) => Exercise | undefined;

/** Peso en el rango de cada ejercicio extra (los 8 base tienen el suyo). */
export const EXTRA_WEIGHT = 0.03;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function isCoreId(id: LiftId): id is CoreLiftId {
  return (LIFTS as string[]).includes(id);
}

/**
 * Niveles esperados (sin entrenar → clase mundial) de un ejercicio. Los base
 * usan su tabla; los extras, la de su ejercicio de referencia × factor.
 * Devuelve null si el ejercicio solo se registra y no se puntúa.
 */
export function levelsFor(
  sex: Sex,
  id: LiftId,
  exercise: Exercise | undefined,
  bodyweightKg: number,
): number[] | null {
  if (isCoreId(id)) return expectedLevels(sex, id, bodyweightKg);
  if (!exercise?.ref) return null;
  const { lift, factor } = exercise.ref;
  return expectedLevels(sex, lift, bodyweightKg).map((value) => value * factor);
}

function scoreFromOneRm(oneRm: number, levels: number[]) {
  if (oneRm <= 0) return { score: 0, percentile: 0, levelIndex: 0, nextKg: levels[1] };

  if (oneRm <= levels[0]) {
    const t = oneRm / levels[0];
    return {
      score: t * 6,
      percentile: t * LEVEL_PERCENTILES[0],
      levelIndex: 0,
      nextKg: levels[0],
    };
  }

  for (let i = 0; i < levels.length - 1; i += 1) {
    const low = levels[i];
    const high = levels[i + 1];
    if (oneRm <= high) {
      const t = (oneRm - low) / (high - low || 1);
      const scoreLow = [6, 18, 32, 50, 68, 86, 98][i];
      const scoreHigh = [18, 32, 50, 68, 86, 98, 100][i];
      const pctLow = LEVEL_PERCENTILES[i];
      const pctHigh = LEVEL_PERCENTILES[i + 1];
      return {
        score: lerp(scoreLow, scoreHigh, t),
        percentile: lerp(pctLow, pctHigh, t),
        levelIndex: i,
        nextKg: high,
      };
    }
  }

  // Por encima de la clase mundial: 98 → 100 en el siguiente 5 %.
  const top = levels[levels.length - 1];
  const t = clamp((oneRm - top) / (top * TOP_OVERSHOOT), 0, 1);
  return {
    score: lerp(98, 100, t),
    percentile: lerp(LEVEL_PERCENTILES[6], 99.7, t),
    levelIndex: 6,
    nextKg: null as number | null,
  };
}

const TOP_OVERSHOOT = 0.05;
const KNOT_SCORES = [6, 18, 32, 50, 68, 86, 98];

/** Inversa de scoreFromOneRm: el 1RM necesario para alcanzar una puntuación. */
export function oneRmForScore(score: number, levels: number[]): number {
  if (score <= 0) return 0;
  if (score <= KNOT_SCORES[0]) return (score / KNOT_SCORES[0]) * levels[0];
  for (let i = 0; i < levels.length - 1; i += 1) {
    if (score <= KNOT_SCORES[i + 1]) {
      const t = (score - KNOT_SCORES[i]) / (KNOT_SCORES[i + 1] - KNOT_SCORES[i]);
      return lerp(levels[i], levels[i + 1], t);
    }
  }
  const top = levels[levels.length - 1];
  return top * (1 + (clamp(score, 98, 100) - 98) / 2 * TOP_OVERSHOOT);
}

export type LadderStep = { rank: (typeof RANKS)[number]; kg: number };

/** Marca (1RM) que pide cada rango en un ejercicio. */
export function rankLadder(levels: number[]): LadderStep[] {
  return RANKS.map((rank) => ({ rank, kg: oneRmForScore(rank.minScore, levels) }));
}

/** Redondea a 0,5 kg hacia arriba: lo que de verdad hay que levantar. */
export function ceilToHalf(kg: number) {
  return Math.ceil(kg * 2 - 1e-9) / 2;
}

/** Rango (con división y puntos) que daría un 1RM en un ejercicio; null si el ejercicio no se puntúa. */
export function liftStanding(
  profile: Profile,
  id: LiftId,
  exercise: Exercise | undefined,
  oneRm: number,
): Standing | null {
  const levels = levelsFor(profile.sex, id, exercise, profile.bodyweightKg);
  if (!levels) return null;
  return standingFromScore(oneRm > 0 ? scoreFromOneRm(oneRm, levels).score : 0);
}

/**
 * Compara una serie nueva con el historial: ¿es marca personal? ¿sube de rango?
 * `before` son las marcas anteriores; `entry` la serie recién guardada.
 */
export function detectRecord(
  profile: Profile,
  before: LiftEntry[],
  entry: LiftEntry,
  resolve: ExerciseResolver,
): RecordEvent | null {
  const newKg = entry.estimated1rm;
  if (!(newKg > 0)) return null;
  const previousKg = bestOneRm(before, entry.lift);
  if (newKg <= previousKg + 1e-9) return null;

  const exercise = resolve(entry.lift);
  const exBefore = liftStanding(profile, entry.lift, exercise, previousKg);
  const exAfter = liftStanding(profile, entry.lift, exercise, newKg);
  const generalBefore = computeSnapshot(profile, before, resolve)?.standing ?? standingFromScore(0);
  const generalAfter =
    computeSnapshot(profile, [entry, ...before], resolve)?.standing ?? standingFromScore(0);
  const index = (standing: Standing) => RANKS.findIndex((rank) => rank.id === standing.rank.id);

  return {
    lift: entry.lift,
    kind: previousKg > 0 ? "pr" : "first",
    previousKg,
    newKg,
    exerciseBefore: exBefore,
    exerciseAfter: exAfter,
    generalBefore,
    generalAfter,
    exerciseRankUp: !!exBefore && !!exAfter && index(exAfter) > index(exBefore),
    generalRankUp: index(generalAfter) > index(generalBefore),
  };
}

export function bestOneRm(entries: LiftEntry[], lift: LiftId) {
  return entries
    .filter((entry) => entry.lift === lift)
    .reduce((max, entry) => Math.max(max, entry.estimated1rm), 0);
}

function weightOf(id: LiftId) {
  return isCoreId(id) ? LIFT_META[id].weight : EXTRA_WEIGHT;
}

export function computeSnapshot(
  profile: Profile | null,
  entries: LiftEntry[],
  resolve: ExerciseResolver,
): RankSnapshot | null {
  if (!profile) return null;

  // Siempre los 8 base; de los extras, solo los que tienen 1RM registrado.
  const extraIds = Array.from(
    new Set(entries.map((entry) => entry.lift).filter((id) => !isCoreId(id))),
  );

  const build = (id: LiftId): LiftScore | null => {
    const levels = levelsFor(profile.sex, id, resolve(id), profile.bodyweightKg);
    if (!levels) return null;
    const oneRm = bestOneRm(entries, id);
    if (!isCoreId(id) && oneRm <= 0) return null;
    const rated = scoreFromOneRm(oneRm, levels);
    return {
      lift: id,
      oneRm,
      score: rated.score,
      percentile: rated.percentile,
      levelLabel: LEVEL_LABELS[rated.levelIndex],
      nextKg: rated.nextKg,
      standing: standingFromScore(oneRm > 0 ? rated.score : 0),
    };
  };

  const core = LIFTS.map(build).filter((item): item is LiftScore => item !== null);
  const extras = extraIds
    .map(build)
    .filter((item): item is LiftScore => item !== null)
    .sort((a, b) => b.score - a.score);
  const lifts = [...core, ...extras];

  const logged = lifts.filter((lift) => lift.oneRm > 0);
  const totalWeight = logged.reduce((sum, lift) => sum + weightOf(lift.lift), 0);
  const score =
    logged.length === 0
      ? 0
      : logged.reduce((sum, lift) => sum + lift.score * weightOf(lift.lift), 0) /
        (totalWeight || 1);

  const percentile =
    logged.length === 0
      ? 0
      : logged.reduce((sum, lift) => sum + lift.percentile * weightOf(lift.lift), 0) /
        (totalWeight || 1);

  const standing = standingFromScore(score);
  const rank = rankFromScore(score);
  const nextRank = nextRankFromScore(score);
  const floor = rank.minScore;
  const ceiling = nextRank?.minScore ?? 100;
  const progressToNext = nextRank
    ? clamp((score - floor) / (ceiling - floor || 1), 0, 1)
    : 1;

  return {
    score,
    percentile,
    rank,
    nextRank,
    progressToNext,
    standing,
    lifts,
  };
}

export function formatKg(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} kg`;
}

export function formatPercent(value: number) {
  if (value >= 99) return value.toFixed(1);
  return Math.round(value).toString();
}
