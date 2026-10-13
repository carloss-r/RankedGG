import type { NextRequest } from "next/server";
import type { ApiError, LeaderboardEntry, SubmitResponse } from "../../../lib/global/types";
import { buildRecord, secretMatches, ValidationError } from "../../../lib/global/validate";
import { getStore } from "../../../lib/server/store";

// Límite simple por IP (best effort, en memoria): 30 envíos por minuto.
const hits = new Map<string, { count: number; reset: number }>();
function limited(ip: string) {
  const now = Date.now();
  const hit = hits.get(ip);
  if (!hit || hit.reset < now) {
    hits.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  hit.count += 1;
  return hit.count > 30;
}

function fail(status: number, error: string, detail?: string) {
  return Response.json({ error, detail } satisfies ApiError, { status });
}

/** Crea o actualiza al jugador. El servidor recalcula score, rango y nivel. */
export async function POST(request: NextRequest) {
  const store = getStore();
  if (!store) return fail(503, "backend_not_configured");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(ip)) return fail(429, "rate_limited");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "bad_json");
  }

  try {
    const id = (body as { playerId?: unknown })?.playerId;
    const existing = typeof id === "string" ? await store.get(id) : null;
    const { record, secret } = buildRecord(body, existing);

    if (existing && !secretMatches(secret, existing.secretHash)) {
      return fail(403, "forbidden");
    }

    await store.upsert(record);
    const pos = await store.position(record.id);
    const me: LeaderboardEntry = {
      position: pos?.position ?? 1,
      id: record.id,
      name: record.name,
      rankId: record.rankId,
      level: record.level,
      score: record.score,
    };
    return Response.json({ ok: true, me } satisfies SubmitResponse);
  } catch (err) {
    if (err instanceof ValidationError) return fail(422, err.code, err.detail);
    console.error("POST /api/scores", err);
    return fail(500, "server_error");
  }
}

/** Borra al jugador del ranking global (requiere playerId + secret). */
export async function DELETE(request: NextRequest) {
  const store = getStore();
  if (!store) return fail(503, "backend_not_configured");

  let body: { playerId?: unknown; secret?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "bad_json");
  }
  if (typeof body.playerId !== "string" || typeof body.secret !== "string") {
    return fail(400, "bad_body");
  }

  try {
    const existing = await store.get(body.playerId);
    if (!existing) return Response.json({ ok: true });
    if (!secretMatches(body.secret, existing.secretHash)) return fail(403, "forbidden");
    await store.remove(existing.id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/scores", err);
    return fail(500, "server_error");
  }
}
