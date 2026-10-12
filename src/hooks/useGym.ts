"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addLift,
  clearAll,
  deleteLift,
  loadLifts,
  loadProfile,
  saveProfile,
} from "../lib/db";
import { computeSnapshot } from "../lib/engine";
import { epley1rm } from "../lib/standards";
import type { LiftEntry, LiftId, Profile, Sex } from "../lib/types";

export function useGym() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<LiftEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [nextProfile, nextEntries] = await Promise.all([loadProfile(), loadLifts()]);
    setProfile(nextProfile);
    setEntries(nextEntries);
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
    await clearAll();
    setProfile(null);
    setEntries([]);
  }, []);

  return {
    ready,
    error,
    profile,
    entries,
    snapshot,
    upsertProfile,
    logLift,
    removeLift,
    reset,
  };
}
