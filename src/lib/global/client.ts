import { CATALOG_VERSION } from "../catalog";
import type { LiftId, Sex } from "../types";
import type {
  ApiError,
  LeaderboardResponse,
  SubmitPayload,
  SubmitResponse,
} from "./types";

/** Identidad anónima del dispositivo. El secret nunca sale de este teléfono salvo hacia /api/scores. */
export type GlobalIdentity = { playerId: string; secret: string };
export type GlobalSettings = { shareGlobally: boolean };

export class GlobalError extends Error {
  constructor(
    public code: string,
    public detail?: string,
  ) {
    super(code);
  }
}

function randomHex(bytes: number) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function createIdentity(): GlobalIdentity {
  return { playerId: crypto.randomUUID(), secret: randomHex(32) };
}

async function parse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({ error: "bad_response" }))) as T | ApiError;
  if (!res.ok) {
    const err = data as ApiError;
    throw new GlobalError(err.error ?? "request_failed", err.detail);
  }
  return data as T;
}

export async function submitScores(input: {
  identity: GlobalIdentity;
  name: string;
  sex: Sex;
  bodyweightKg: number;
  bests: Record<LiftId, number>;
}) {
  const payload: SubmitPayload = {
    playerId: input.identity.playerId,
    secret: input.identity.secret,
    name: input.name,
    sex: input.sex,
    bodyweightKg: input.bodyweightKg,
    bests: input.bests,
    catalogVersion: CATALOG_VERSION,
  };
  const res = await fetch("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parse<SubmitResponse>(res);
}

export async function leaveGlobal(identity: GlobalIdentity) {
  const res = await fetch("/api/scores", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(identity),
  });
  await parse<{ ok: true }>(res);
}

export async function fetchLeaderboard(opts: {
  lift?: LiftId;
  playerId?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (opts.lift) params.set("lift", opts.lift);
  if (opts.playerId) params.set("playerId", opts.playerId);
  if (opts.limit) params.set("limit", String(opts.limit));
  const res = await fetch(`/api/leaderboard?${params.toString()}`, { cache: "no-store" });
  return parse<LeaderboardResponse>(res);
}
