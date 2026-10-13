import { createHash, timingSafeEqual } from "node:crypto";
import { CATALOG_VERSION, isLiftId, VALIDATION } from "../catalog";
import { computeSnapshot } from "../engine";
import { computeRpgSheet } from "../rpg";
import { expectedLevels } from "../standards";
import type { LiftEntry, LiftId, Profile, Sex } from "../types";
import type { PlayerRecord, SubmitPayload } from "./types";

export class ValidationError extends Error {
  constructor(
    public code: string,
    public detail?: string,
  ) {
    super(code);
  }
}

export function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function secretMatches(secret: string, storedHash: string) {
  const a = Buffer.from(hashSecret(secret), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sanitizeName(raw: unknown) {
  const name = String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
  return name || "Atleta";
}

const ID_RE = /^[A-Za-z0-9-]{16,64}$/;
const SECRET_RE = /^[A-Za-z0-9]{32,128}$/;

/** Valida el payload y recalcula score, rango, XP y nivel en el servidor. */
export function buildRecord(
  input: unknown,
  existing: PlayerRecord | null,
): { record: PlayerRecord; secret: string } {
  if (!input || typeof input !== "object") throw new ValidationError("bad_body");
  const body = input as Partial<SubmitPayload>;

  if (typeof body.playerId !== "string" || !ID_RE.test(body.playerId)) {
    throw new ValidationError("bad_player_id");
  }
  if (typeof body.secret !== "string" || !SECRET_RE.test(body.secret)) {
    throw new ValidationError("bad_secret");
  }
  if (body.catalogVersion !== CATALOG_VERSION) {
    throw new ValidationError("catalog_mismatch", `servidor v${CATALOG_VERSION}`);
  }

  const sex: Sex | null = body.sex === "male" || body.sex === "female" ? body.sex : null;
  if (!sex) throw new ValidationError("bad_sex");

  const bodyweightKg = Number(body.bodyweightKg);
  if (!Number.isFinite(bodyweightKg) || bodyweightKg < 30 || bodyweightKg > 250) {
    throw new ValidationError("bad_bodyweight");
  }

  const bests: Record<LiftId, number> = {};
  const rawBests = body.bests && typeof body.bests === "object" ? body.bests : {};
  for (const [lift, value] of Object.entries(rawBests)) {
    if (!isLiftId(lift)) throw new ValidationError("unknown_lift", lift);
    const oneRm = Number(value);
    if (!Number.isFinite(oneRm) || oneRm <= 0) continue;
    const worldClass = expectedLevels(sex, lift, bodyweightKg).at(-1) ?? 0;
    if (oneRm > worldClass * VALIDATION.maxPlausibleOfWorldClass) {
      throw new ValidationError("implausible_mark", lift);
    }
    bests[lift] = Math.round(oneRm * 10) / 10;
  }
  if (Object.keys(bests).length === 0) throw new ValidationError("no_marks");

  const name = sanitizeName(body.name);
  const now = new Date().toISOString();
  const profile: Profile = { name, sex, bodyweightKg, createdAt: now, updatedAt: now };
  const entries: LiftEntry[] = Object.entries(bests).map(([lift, oneRm]) => ({
    id: lift,
    lift,
    weightKg: oneRm,
    reps: 1,
    estimated1rm: oneRm,
    date: now,
  }));

  const snapshot = computeSnapshot(profile, entries);
  if (!snapshot) throw new ValidationError("bad_profile");
  const sheet = computeRpgSheet(snapshot.lifts);

  const liftScores: Record<LiftId, number> = {};
  for (const lift of snapshot.lifts) {
    if (lift.oneRm > 0) liftScores[lift.lift] = Math.round(lift.score * 100) / 100;
  }

  return {
    secret: body.secret,
    record: {
      id: body.playerId,
      secretHash: existing?.secretHash ?? hashSecret(body.secret),
      name,
      sex,
      bodyweightKg,
      bests,
      liftScores,
      score: Math.round(snapshot.score * 100) / 100,
      percentile: Math.round(snapshot.percentile * 10) / 10,
      rankId: snapshot.rank.id,
      xp: sheet.xp,
      level: sheet.level,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
  };
}
