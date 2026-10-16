import {
  get,
  limitToLast,
  orderByChild,
  query,
  ref,
  startAfter,
  update,
} from "firebase/database";
import {
  isLiftId,
  isMuscleId,
  isVariantId,
  LIFTS,
  MUSCLE_IDS,
  variantsOf,
  VALIDATION,
} from "../catalog";
import { bestByVariant, bestOneRm, computeSnapshot, scoreLift } from "../engine";
import { GlobalError, toGlobalError } from "../global/errors";
import type {
  LeaderboardEntry,
  LeaderboardResponse,
  PublishedLift,
  PublishedMuscle,
  PublishedPlayer,
  Scope,
} from "../global/types";
import { computeMuscleScores, computeRpgSheet } from "../rpg";
import { expectedLevels } from "../standards";
import type { LiftEntry, Profile, RankId } from "../types";
import { getFirebase } from "./app";
import { ensureUser } from "./auth";
import { getRegistration } from "./users";

/*
 * Modelo en Realtime Database (ver database.rules.json, generado con `npm run rules`):
 *   users/{uid}                          registro verificado (nombre completo, privado)
 *   players/{uid}                        ranking general
 *   muscles/{muscle}/{uid}               ranking por grupo muscular
 *   lifts/{lift}/{uid}                   ranking por ejercicio (1RM equivalente al ejercicio base)
 *   variants/{lift}/{variant}/{uid}      ranking por variante (1RM real de la variante)
 * Todos los rankings están indexados por `score`. Solo escribe el dueño (auth.uid) y solo si
 * users/{uid} existe y está activo. El peso corporal y el sexo NUNCA se guardan.
 */

type Update = PublishedPlayer | PublishedLift | PublishedMuscle | null;

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

/** Comprobación de cordura antes de subir (las reglas de la base repiten un tope más amplio). */
function assertPlausible(profile: Profile, entries: LiftEntry[]) {
  for (const lift of LIFTS) {
    const best = bestOneRm(entries, lift);
    if (best <= 0) continue;
    const worldClass = expectedLevels(profile.sex, lift, profile.bodyweightKg).at(-1) ?? 0;
    if (best > worldClass * VALIDATION.maxPlausibleOfWorldClass) {
      throw new GlobalError("implausible_mark", lift);
    }
  }
}

/**
 * Verifica el registro en la base y publica tu ficha en todos los rankings
 * (general, músculos, ejercicios y variantes).
 */
export async function publishPlayer(input: {
  profile: Profile;
  entries: LiftEntry[];
}): Promise<LeaderboardEntry> {
  const { profile, entries } = input;
  const snapshot = computeSnapshot(profile, entries);
  if (!snapshot || snapshot.lifts.every((lift) => lift.oneRm <= 0)) {
    throw new GlobalError("no_marks");
  }
  assertPlausible(profile, entries);

  const user = await ensureUser();
  const registration = await getRegistration(user.uid);
  if (!registration) throw new GlobalError("not_registered");

  const { db } = getFirebase();
  const name = registration.publicName;
  const sheet = computeRpgSheet(snapshot.lifts);
  const rankId = snapshot.rank.id;
  const base = { name, rankId, level: sheet.level };

  const bests: Record<string, number> = {};
  for (const lift of snapshot.lifts) if (lift.oneRm > 0) bests[lift.lift] = round(lift.oneRm, 1);

  const player: PublishedPlayer = {
    ...base,
    xp: sheet.xp,
    score: round(snapshot.score, 2),
    percentile: round(snapshot.percentile, 1),
    updatedAt: Date.now(),
    bests,
  };

  // Una sola actualización atómica en varias rutas; lo que ya no aplica se borra (null).
  const updates: Record<string, Update> = { [`players/${user.uid}`]: player };

  for (const lift of snapshot.lifts) {
    updates[`lifts/${lift.lift}/${user.uid}`] =
      lift.oneRm > 0
        ? { ...base, score: round(lift.score, 2), oneRm: round(lift.oneRm, 1) }
        : null;

    const perVariant = bestByVariant(entries, lift.lift);
    for (const variant of variantsOf(lift.lift)) {
      const best = perVariant[variant.id];
      updates[`variants/${lift.lift}/${variant.id}/${user.uid}`] = best
        ? {
            ...base,
            score: round(scoreLift(profile, lift.lift, best.equivalent).score, 2),
            oneRm: round(best.raw, 1),
          }
        : null;
    }
  }

  const muscles = new Map(computeMuscleScores(snapshot.lifts).map((item) => [item.muscle, item]));
  for (const muscle of MUSCLE_IDS) {
    const item = muscles.get(muscle);
    updates[`muscles/${muscle}/${user.uid}`] = item
      ? { ...base, score: round(item.score, 2), lifts: item.lifts }
      : null;
  }

  try {
    await update(ref(db), updates);
  } catch (err) {
    throw toGlobalError(err);
  }

  const position = await positionOf(user.uid, { kind: "overall" });
  return { position: position ?? 1, id: user.uid, ...base, score: player.score };
}

/** Borra tu ficha pública de todos los rankings (el registro en users/ se conserva). */
export async function leavePlayer() {
  try {
    const { auth, db } = getFirebase();
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) return;
    const updates: Record<string, null> = { [`players/${user.uid}`]: null };
    for (const lift of LIFTS) {
      updates[`lifts/${lift}/${user.uid}`] = null;
      for (const variant of variantsOf(lift)) {
        updates[`variants/${lift}/${variant.id}/${user.uid}`] = null;
      }
    }
    for (const muscle of MUSCLE_IDS) updates[`muscles/${muscle}/${user.uid}`] = null;
    await update(ref(db), updates);
  } catch (err) {
    throw toGlobalError(err);
  }
}

type Stored = {
  name?: string;
  rankId?: RankId;
  level?: number;
  score?: number;
  oneRm?: number;
};

export function scopeKey(scope: Scope) {
  if (scope.kind === "overall") return "overall";
  if (scope.kind === "muscle") return `muscle:${scope.id}`;
  return `lift:${scope.id}:${scope.variant ?? "all"}`;
}

function pathFor(scope: Scope) {
  if (scope.kind === "muscle") {
    if (!isMuscleId(scope.id)) throw new GlobalError("unknown_scope");
    return `muscles/${scope.id}`;
  }
  if (scope.kind === "lift") {
    if (!isLiftId(scope.id)) throw new GlobalError("unknown_scope");
    if (scope.variant) {
      if (!isVariantId(scope.id, scope.variant)) throw new GlobalError("unknown_scope");
      return `variants/${scope.id}/${scope.variant}`;
    }
    return `lifts/${scope.id}`;
  }
  return "players";
}

function toEntry(id: string, value: Stored, position: number): LeaderboardEntry {
  return {
    position,
    id,
    name: value.name ?? "Atleta",
    rankId: value.rankId ?? "wood",
    level: value.level ?? 1,
    score: value.score ?? 0,
    ...(value.oneRm !== undefined ? { oneRm: value.oneRm } : {}),
  };
}

/** Posición (empates comparten posición) contando a quienes tienen score mayor. */
async function positionOf(uid: string, scope: Scope): Promise<number | null> {
  const { db } = getFirebase();
  const path = pathFor(scope);
  const mine = await get(ref(db, `${path}/${uid}`));
  const score = (mine.val() as Stored | null)?.score;
  if (typeof score !== "number") return null;
  const above = await get(query(ref(db, path), orderByChild("score"), startAfter(score)));
  return above.size + 1;
}

/** Ranking (top `limit`) del ámbito pedido y tu posición. */
export async function fetchLeaderboard(opts: {
  scope: Scope;
  playerId?: string | null;
  limit?: number;
}): Promise<LeaderboardResponse> {
  const { scope } = opts;
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));

  try {
    const { db } = getFirebase();
    const path = pathFor(scope);
    const snap = await get(query(ref(db, path), orderByChild("score"), limitToLast(limit)));

    const rows: { id: string; value: Stored }[] = [];
    snap.forEach((child) => {
      rows.push({ id: child.key as string, value: child.val() as Stored });
    });
    // limitToLast devuelve en orden ascendente: lo invertimos para mostrar de mayor a menor.
    rows.reverse();

    const entries = rows.map((row, index) => {
      let position = index + 1;
      while (position > 1 && (rows[position - 2].value.score ?? 0) === (row.value.score ?? 0)) {
        position -= 1;
      }
      return toEntry(row.id, row.value, position);
    });

    let me: LeaderboardEntry | null = null;
    if (opts.playerId) {
      const inList = entries.find((entry) => entry.id === opts.playerId);
      if (inList) {
        me = inList;
      } else {
        const mine = await get(ref(db, `${path}/${opts.playerId}`));
        if (mine.exists()) {
          const position = await positionOf(opts.playerId, scope);
          me = toEntry(opts.playerId, mine.val() as Stored, position ?? entries.length + 1);
        }
      }
    }

    return { scope, entries, me };
  } catch (err) {
    throw toGlobalError(err);
  }
}
