import type { NextRequest } from "next/server";
import { isLiftId } from "../../../lib/catalog";
import type { ApiError, LeaderboardResponse } from "../../../lib/global/types";
import { getStore } from "../../../lib/server/store";

function fail(status: number, error: string) {
  return Response.json({ error } satisfies ApiError, { status });
}

/**
 * GET /api/leaderboard?lift=squat&limit=50&playerId=...
 * Sin `lift` devuelve el ranking general por score. `playerId` añade tu posición.
 */
export async function GET(request: NextRequest) {
  const store = getStore();
  if (!store) return fail(503, "backend_not_configured");

  const params = request.nextUrl.searchParams;
  const liftParam = params.get("lift");
  if (liftParam && !isLiftId(liftParam)) return fail(400, "unknown_lift");
  const lift = liftParam ?? undefined;

  const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 50));
  const playerId = params.get("playerId");

  try {
    const rows = await store.top({ lift, limit });

    // Empates comparten posición (competition ranking).
    const entries = rows.map((row, index) => {
      let position = index + 1;
      while (position > 1 && rows[position - 2].score === row.score) position -= 1;
      return { position, ...row };
    });

    let me: LeaderboardResponse["me"] = null;
    if (playerId) {
      const found = await store.position(playerId, lift);
      if (found) me = { position: found.position, ...found.row };
    }

    return Response.json({ lift, entries, me } satisfies LeaderboardResponse, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("GET /api/leaderboard", err);
    return fail(500, "server_error");
  }
}
