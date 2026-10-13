import type { PlayerRecord } from "../global/types";
import type { RankId, Sex } from "../types";
import type { PlayerStore, StoreRow } from "./store";

/**
 * Adaptador de Supabase vía PostgREST (sin dependencias). Esquema en supabase/schema.sql.
 * Usa la service role key: solo debe existir en variables de entorno del servidor.
 */

type PlayerDb = {
  id: string;
  secret_hash: string;
  name: string;
  sex: Sex;
  bodyweight_kg: number;
  score: number;
  percentile: number;
  rank_id: RankId;
  xp: number;
  level: number;
  bests: Record<string, number>;
  lift_scores: Record<string, number>;
  created_at: string;
  updated_at: string;
};

type LiftDb = {
  player_id: string;
  one_rm: number;
  score: number;
  players: { name: string; rank_id: RankId; level: number };
};

function fromDb(row: PlayerDb): PlayerRecord {
  return {
    id: row.id,
    secretHash: row.secret_hash,
    name: row.name,
    sex: row.sex,
    bodyweightKg: Number(row.bodyweight_kg),
    score: Number(row.score),
    percentile: Number(row.percentile),
    rankId: row.rank_id,
    xp: row.xp,
    level: row.level,
    bests: row.bests,
    liftScores: row.lift_scores,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function supabaseStore(baseUrl: string, serviceKey: string): PlayerStore {
  const rest = `${baseUrl.replace(/\/$/, "")}/rest/v1`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  async function call(path: string, init: RequestInit = {}) {
    const res = await fetch(`${rest}${path}`, {
      ...init,
      cache: "no-store",
      headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    return res;
  }

  async function countAbove(table: string, filter: string) {
    const res = await call(`/${table}?select=${table === "players" ? "id" : "player_id"}&${filter}&limit=1`, {
      headers: { Prefer: "count=exact" },
    });
    const range = res.headers.get("content-range") ?? "";
    return Number(range.split("/")[1] ?? 0) || 0;
  }

  const playerRow = (p: PlayerDb): StoreRow => ({
    id: p.id,
    name: p.name,
    rankId: p.rank_id,
    level: p.level,
    score: Number(p.score),
  });

  const liftRow = (r: LiftDb): StoreRow => ({
    id: r.player_id,
    name: r.players.name,
    rankId: r.players.rank_id,
    level: r.players.level,
    score: Number(r.score),
    oneRm: Number(r.one_rm),
  });

  return {
    async get(id) {
      const res = await call(`/players?select=*&id=eq.${encodeURIComponent(id)}&limit=1`);
      const rows = (await res.json()) as PlayerDb[];
      return rows[0] ? fromDb(rows[0]) : null;
    },

    async upsert(record) {
      const body: PlayerDb = {
        id: record.id,
        secret_hash: record.secretHash,
        name: record.name,
        sex: record.sex,
        bodyweight_kg: record.bodyweightKg,
        score: record.score,
        percentile: record.percentile,
        rank_id: record.rankId,
        xp: record.xp,
        level: record.level,
        bests: record.bests,
        lift_scores: record.liftScores,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
      };
      await call(`/players?on_conflict=id`, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(body),
      });

      const id = encodeURIComponent(record.id);
      await call(`/lift_scores?player_id=eq.${id}`, { method: "DELETE" });
      const lifts = Object.entries(record.bests).map(([lift, oneRm]) => ({
        player_id: record.id,
        lift,
        one_rm: oneRm,
        score: record.liftScores[lift] ?? 0,
      }));
      if (lifts.length > 0) {
        await call(`/lift_scores`, {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify(lifts),
        });
      }
    },

    async remove(id) {
      await call(`/players?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
    },

    async top({ lift, limit }) {
      if (lift) {
        const res = await call(
          `/lift_scores?select=player_id,one_rm,score,players(name,rank_id,level)&lift=eq.${encodeURIComponent(lift)}&order=score.desc&limit=${limit}`,
        );
        return ((await res.json()) as LiftDb[]).map(liftRow);
      }
      const res = await call(
        `/players?select=id,name,rank_id,level,score&order=score.desc,updated_at.asc&limit=${limit}`,
      );
      return ((await res.json()) as PlayerDb[]).map(playerRow);
    },

    async position(id, lift) {
      const pid = encodeURIComponent(id);
      if (lift) {
        const res = await call(
          `/lift_scores?select=player_id,one_rm,score,players(name,rank_id,level)&lift=eq.${encodeURIComponent(lift)}&player_id=eq.${pid}&limit=1`,
        );
        const found = ((await res.json()) as LiftDb[])[0];
        if (!found) return null;
        const above = await countAbove(
          "lift_scores",
          `lift=eq.${encodeURIComponent(lift)}&score=gt.${found.score}`,
        );
        return { position: above + 1, row: liftRow(found) };
      }
      const res = await call(`/players?select=id,name,rank_id,level,score&id=eq.${pid}&limit=1`);
      const found = ((await res.json()) as PlayerDb[])[0];
      if (!found) return null;
      const above = await countAbove("players", `score=gt.${found.score}`);
      return { position: above + 1, row: playerRow(found) };
    },
  };
}
