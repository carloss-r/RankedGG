import type { LiftId } from "../types";
import type { PlayerRecord } from "../global/types";
import type { PlayerStore, StoreRow } from "./store";

const g = globalThis as unknown as { __rankedggPlayers?: Map<string, PlayerRecord> };

function toRow(record: PlayerRecord, lift?: LiftId): StoreRow | null {
  if (lift) {
    const score = record.liftScores[lift];
    if (score === undefined) return null;
    return {
      id: record.id,
      name: record.name,
      rankId: record.rankId,
      level: record.level,
      score,
      oneRm: record.bests[lift],
    };
  }
  return {
    id: record.id,
    name: record.name,
    rankId: record.rankId,
    level: record.level,
    score: record.score,
  };
}

export function memoryStore(): PlayerStore {
  const players = (g.__rankedggPlayers ??= new Map());

  function sorted(lift?: LiftId) {
    return [...players.values()]
      .map((record) => ({ record, row: toRow(record, lift) }))
      .filter((item): item is { record: PlayerRecord; row: StoreRow } => item.row !== null)
      .sort((a, b) => b.row.score - a.row.score || a.record.updatedAt.localeCompare(b.record.updatedAt));
  }

  return {
    async get(id) {
      return players.get(id) ?? null;
    },
    async upsert(record) {
      players.set(record.id, record);
    },
    async remove(id) {
      players.delete(id);
    },
    async top({ lift, limit }) {
      return sorted(lift)
        .slice(0, limit)
        .map((item) => item.row);
    },
    async position(id, lift) {
      const record = players.get(id);
      const row = record ? toRow(record, lift) : null;
      if (!row) return null;
      const above = sorted(lift).filter((item) => item.row.score > row.score).length;
      return { position: above + 1, row };
    },
  };
}
