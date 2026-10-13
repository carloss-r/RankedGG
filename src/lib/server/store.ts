import type { LiftId } from "../types";
import type { LeaderboardEntry, PlayerRecord } from "../global/types";
import { memoryStore } from "./memoryStore";
import { supabaseStore } from "./supabaseStore";

export type StoreRow = Omit<LeaderboardEntry, "position">;

/**
 * Contrato de persistencia del ranking global. Para cambiar de proveedor
 * (Supabase, Firebase, Postgres, Upstash...) basta con implementar esta interfaz
 * y devolverla desde getStore().
 *
 * `score` en StoreRow es el valor por el que se ordena: el score global (0-100)
 * o, si se pasa `lift`, el score de ese ejercicio (con `oneRm` informado).
 */
export interface PlayerStore {
  get(id: string): Promise<PlayerRecord | null>;
  upsert(record: PlayerRecord): Promise<void>;
  remove(id: string): Promise<void>;
  top(opts: { lift?: LiftId; limit: number }): Promise<StoreRow[]>;
  /** Posición 1-based (empates comparten posición) y fila del jugador. */
  position(id: string, lift?: LiftId): Promise<{ position: number; row: StoreRow } | null>;
}

let cached: PlayerStore | null | undefined;

/** null = ranking global no configurado en este entorno. */
export function getStore(): PlayerStore | null {
  if (cached !== undefined) return cached;

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    cached = supabaseStore(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  } else if (process.env.NODE_ENV !== "production" || process.env.RANKEDGG_STORE === "memory") {
    // Solo para desarrollo/demo: en serverless la memoria no es compartida ni persistente.
    cached = memoryStore();
  } else {
    cached = null;
  }
  return cached;
}
