"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addLift,
  clearAll,
  deleteLift,
  loadLifts,
  loadMeta,
  loadProfile,
  saveMeta,
  saveProfile,
} from "../lib/db";
import { bestOneRm, computeSnapshot } from "../lib/engine";
import { ensureUser, leavePlayer, publishPlayer } from "../lib/firebase/leaderboard";
import { toGlobalError } from "../lib/global/errors";
import type { LeaderboardEntry } from "../lib/global/types";
import { computeRpgSheet } from "../lib/rpg";
import { epley1rm, LIFTS } from "../lib/standards";
import type { LiftEntry, LiftId, Profile, Sex } from "../lib/types";

const SETTINGS_KEY = "global-settings";

type GlobalSettings = { shareGlobally: boolean };

export type GlobalSync = {
  status: "idle" | "syncing" | "ok" | "error";
  /** Código de error (p. ej. auth_disabled, permission_denied, implausible_mark). */
  error?: string;
  detail?: string;
  me?: LeaderboardEntry;
};

export function useGym() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<LiftEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  /** uid de Firebase Auth (anónimo). Se conoce tras la primera sincronización. */
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [shareGlobally, setShareGlobally] = useState(false);
  const [sync, setSync] = useState<GlobalSync>({ status: "idle" });

  const refresh = useCallback(async () => {
    const [nextProfile, nextEntries, nextSettings] = await Promise.all([
      loadProfile(),
      loadLifts(),
      loadMeta<GlobalSettings>(SETTINGS_KEY),
    ]);
    setProfile(nextProfile);
    setEntries(nextEntries);
    setShareGlobally(nextSettings?.shareGlobally ?? false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh()
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error al cargar");
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const snapshot = useMemo(() => computeSnapshot(profile, entries), [profile, entries]);
  const rpg = useMemo(() => (snapshot ? computeRpgSheet(snapshot.lifts) : null), [snapshot]);

  /** Mejor 1RM por ejercicio: lo único que viaja al ranking global junto con tu perfil. */
  const bests = useMemo(() => {
    const result: Record<LiftId, number> = {};
    for (const lift of LIFTS) {
      const value = bestOneRm(entries, lift);
      if (value > 0) result[lift] = value;
    }
    return result;
  }, [entries]);

  // Sincroniza con el ranking global (con debounce) cuando el usuario participa.
  useEffect(() => {
    if (!ready || !shareGlobally || !profile) return;
    if (Object.keys(bests).length === 0) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSync((prev) => ({ ...prev, status: "syncing" }));
      try {
        const me = await publishPlayer({ profile, entries, bests });
        if (cancelled) return;
        setPlayerId(me.id);
        setSync({ status: "ok", me });
      } catch (err) {
        if (cancelled) return;
        const failure = toGlobalError(err);
        setSync({ status: "error", error: failure.code, detail: failure.detail });
      }
    }, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ready, shareGlobally, profile, entries, bests]);

  const enableGlobal = useCallback(async () => {
    await saveMeta<GlobalSettings>(SETTINGS_KEY, { shareGlobally: true });
    setShareGlobally(true);
    try {
      // Crea (o recupera) la sesión anónima para poder ver tu posición de inmediato.
      const user = await ensureUser();
      setPlayerId(user.uid);
    } catch (err) {
      const failure = toGlobalError(err);
      setSync({ status: "error", error: failure.code, detail: failure.detail });
    }
  }, []);

  const disableGlobal = useCallback(async () => {
    await saveMeta<GlobalSettings>(SETTINGS_KEY, { shareGlobally: false });
    setShareGlobally(false);
    setSync({ status: "idle" });
    try {
      await leavePlayer();
    } catch {
      // Sin conexión: ya no se actualiza; al volver a activar se reescribe tu ficha.
    }
  }, []);

  const upsertProfile = useCallback(
    async (partial: { name: string; sex: Sex; bodyweightKg: number }) => {
      const now = new Date().toISOString();
      const next: Profile = {
        name: partial.name.trim() || "Atleta",
        sex: partial.sex,
        bodyweightKg: partial.bodyweightKg,
        createdAt: profile?.createdAt ?? now,
        updatedAt: now,
      };
      await saveProfile(next);
      setProfile(next);
    },
    [profile],
  );

  const logLift = useCallback(
    async (input: { lift: LiftId; weightKg: number; reps: number; date?: string }) => {
      const entry: LiftEntry = {
        id: crypto.randomUUID(),
        lift: input.lift,
        weightKg: input.weightKg,
        reps: input.reps,
        estimated1rm: Math.round(epley1rm(input.weightKg, input.reps) * 10) / 10,
        date: input.date ?? new Date().toISOString(),
      };
      await addLift(entry);
      setEntries((prev) => [entry, ...prev]);
    },
    [],
  );

  const removeLift = useCallback(async (id: string) => {
    await deleteLift(id);
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const reset = useCallback(async () => {
    if (shareGlobally) {
      try {
        await leavePlayer();
      } catch {
        // Best effort: igualmente se borran los datos locales.
      }
    }
    await clearAll();
    setProfile(null);
    setEntries([]);
    setPlayerId(null);
    setShareGlobally(false);
    setSync({ status: "idle" });
  }, [shareGlobally]);

  return {
    ready,
    error,
    profile,
    entries,
    snapshot,
    rpg,
    playerId,
    shareGlobally,
    sync,
    enableGlobal,
    disableGlobal,
    upsertProfile,
    logLift,
    removeLift,
    reset,
  };
}
