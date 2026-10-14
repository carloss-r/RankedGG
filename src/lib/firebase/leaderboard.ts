import { signInAnonymously, type User } from "firebase/auth";
import {
  get,
  limitToLast,
  orderByChild,
  query,
  ref,
  startAfter,
  update,
} from "firebase/database";
import { isLiftId, LIFTS, VALIDATION } from "../catalog";
import { computeSnapshot } from "../engine";
import { GlobalError, toGlobalError } from "../global/errors";
import type {
  LeaderboardEntry,
  LeaderboardResponse,
  PublishedLift,
  PublishedPlayer,
} from "../global/types";
import { computeRpgSheet } from "../rpg";
import { expectedLevels } from "../standards";
import type { LiftEntry, LiftId, Profile, RankId } from "../types";
import { getFirebase } from "./app";

/*
 * Modelo en Realtime Database (ver database.rules.json):
 *   players/{uid}        -> PublishedPlayer   (ranking general, indexado por score)
 *   lifts/{lift}/{uid}   -> PublishedLift     (ranking por ejercicio, indexado por score)
 * El uid es el de Firebase Auth anónimo: solo su dueño puede escribir su nodo.
 * El peso corporal y el sexo NUNCA se guardan; el score se calcula en el dispositivo.
 */

/** Devuelve el usuario anónimo actual, creándolo si hace falta. */
export async function ensureUser(): Promise<User> {
  try {
    const { auth } = getFirebase();
    await auth.authStateReady();
    if (auth.currentUser) return auth.currentUser;
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    throw toGlobalError(err);
  }
}

/** Comprobación de cordura antes de subir (las reglas de la base repiten un tope más amplio). */
function assertPlausible(profile: Profile, bests: Record<LiftId, number>) {
  for (const [lift, oneRm] of Object.entries(bests)) {
    const worldClass = expectedLevels(profile.sex, lift, profile.bodyweightKg).at(-1) ?? 0;
    if (oneRm > worldClass * VALIDATION.maxPlausibleOfWorldClass) {
      throw new GlobalError("implausible_mark", lift);
    }
  }
}

/** Calcula y publica tu ficha pública (general + una entrada por ejercicio registrado). */
export async function publishPlayer(input: {
  profile: Profile;
  entries: LiftEntry[];
  bests: Record<LiftId, number>;
}): Promise<LeaderboardEntry> {
  const { profile, entries, bests } = input;
  if (Object.keys(bests).length === 0) throw new GlobalError("no_marks");
  assertPlausible(profile, bests);

  const snapshot = computeSnapshot(profile, entries);
  if (!snapshot) throw new GlobalError("no_marks");
  const sheet = computeRpgSheet(snapshot.lifts);

  const user = await ensureUser();
  const { db } = getFirebase();
  const name = profile.name.replace(/\s+/g, " ").trim().slice(0, 24) || "Atleta";
  const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

  const player: PublishedPlayer = {
    name,
    rankId: snapshot.rank.id,
    level: sheet.level,
    xp: sheet.xp,
    score: round(snapshot.score, 2),
    percentile: round(snapshot.percentile, 1),
    updatedAt: Date.now(),
    bests: Object.fromEntries(Object.entries(bests).map(([k, v]) => [k, round(v, 1)])),
  };

  // Actualización atómica en varias rutas; los ejercicios sin marca se borran (null).
  const updates: Record<string, PublishedPlayer | PublishedLift | null> = {
    [`players/${user.uid}`]: player,
  };
  for (const lift of snapshot.lifts) {
    updates[`lifts/${lift.lift}/${user.uid}`] =
      lift.oneRm > 0
        ? {
            name,
            rankId: snapshot.rank.id,
            level: sheet.level,
            score: round(lift.score, 2),
            oneRm: round(lift.oneRm, 1),
          }
        : null;
  }

  try {
    await update(ref(db), updates);
  } catch (err) {
    throw toGlobalError(err);
  }

  const position = await positionOf(user.uid, undefined);
  return {
    position: position ?? 1,
    id: user.uid,
    name,
    rankId: player.rankId,
    level: player.level,
    score: player.score,
  };
}

/** Borra tu ficha del ranking global. */
export async function leavePlayer() {
  try {
    const { auth, db } = getFirebase();
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) return;
    const updates: Record<string, null> = { [`players/${user.uid}`]: null };
    for (const lift of LIFTS) updates[`lifts/${lift}/${user.uid}`] = null;
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

function pathFor(lift?: LiftId) {
  return lift ? `lifts/${lift}` : "players";
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
async function positionOf(uid: string, lift?: LiftId): Promise<number | null> {
  const { db } = getFirebase();
  const mine = await get(ref(db, `${pathFor(lift)}/${uid}`));
  const score = (mine.val() as Stored | null)?.score;
  if (typeof score !== "number") return null;
  const above = await get(
    query(ref(db, pathFor(lift)), orderByChild("score"), startAfter(score)),
  );
  return above.size + 1;
}

/** Ranking general o por ejercicio (top `limit`) y tu posición. */
export async function fetchLeaderboard(opts: {
  lift?: LiftId;
  playerId?: string | null;
  limit?: number;
}): Promise<LeaderboardResponse> {
  if (opts.lift && !isLiftId(opts.lift)) throw new GlobalError("unknown_lift");
  const limit = Math.min(100, Math.max(1, opts.limit ?? 50));

  try {
    const { db } = getFirebase();
    const snap = await get(
      query(ref(db, pathFor(opts.lift)), orderByChild("score"), limitToLast(limit)),
    );

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
        const mine = await get(ref(db, `${pathFor(opts.lift)}/${opts.playerId}`));
        if (mine.exists()) {
          const position = await positionOf(opts.playerId, opts.lift);
          me = toEntry(opts.playerId, mine.val() as Stored, position ?? entries.length + 1);
        }
      }
    }

    return { lift: opts.lift, entries, me };
  } catch (err) {
    throw toGlobalError(err);
  }
}
