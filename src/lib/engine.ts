import { LEVELS } from "./catalog";
import { nextRankFromScore, rankFromScore } from "./ranks";
import {
  expectedLevels,
  LEVEL_LABELS,
  LEVEL_PERCENTILES,
  LIFT_META,
  LIFTS,
} from "./standards";
import type {
  LiftEntry,
  LiftId,
  LiftScore,
  Profile,
  RankSnapshot,
} from "./types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
      const scoreLow = LEVELS.scoreLow[i];
      const scoreHigh = LEVELS.scoreHigh[i];
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

  return {
    score: 100,
    percentile: 99.7,
    levelIndex: 6,
    nextKg: null as number | null,
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function bestOneRm(entries: LiftEntry[], lift: LiftId) {
  return entries
    .filter((entry) => entry.lift === lift)
    .reduce((max, entry) => Math.max(max, entry.estimated1rm), 0);
}

export function computeSnapshot(
  profile: Profile | null,
  entries: LiftEntry[],
): RankSnapshot | null {
  if (!profile) return null;

  const lifts: LiftScore[] = LIFTS.map((lift) => {
    const oneRm = bestOneRm(entries, lift);
    const levels = expectedLevels(profile.sex, lift, profile.bodyweightKg);
    const rated = scoreFromOneRm(oneRm, levels);
    return {
      lift,
      oneRm,
      score: rated.score,
      percentile: rated.percentile,
      levelLabel: LEVEL_LABELS[rated.levelIndex],
      nextKg: rated.nextKg,
    };
  });

  const logged = lifts.filter((lift) => lift.oneRm > 0);
  const totalWeight = logged.reduce((sum, lift) => sum + LIFT_META[lift.lift].weight, 0);
  const score =
    logged.length === 0
      ? 0
      : logged.reduce((sum, lift) => sum + lift.score * LIFT_META[lift.lift].weight, 0) /
        (totalWeight || 1);

  const percentile =
    logged.length === 0
      ? 0
      : logged.reduce(
          (sum, lift) => sum + lift.percentile * LIFT_META[lift.lift].weight,
          0,
        ) / (totalWeight || 1);

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
