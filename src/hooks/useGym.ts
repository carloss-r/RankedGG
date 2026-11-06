"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addLift,
  deleteLift,
  loadCustomExercises,
  loadLifts,
  loadProfile,
  loadSessions,
  saveCustomExercise,
  saveProfile,
  saveWorkoutSession,
} from "../lib/db";
import { computeSnapshot, detectRecord } from "../lib/engine";
import {
  EXERCISES,
  EXERCISE_MAP,
  estimateOneRm,
  normalizeText,
} from "../lib/exercises";
import { newId } from "../lib/id";
import { isStale, lastActivityMs } from "../lib/sessions";
import type {
  Equipment,
  Exercise,
  ExerciseKind,
  LiftEntry,
  LiftId,
  MuscleGroup,
  Profile,
  RecordEvent,
  Sex,
  WorkoutSession,
} from "../lib/types";

/** Ejecuta las tareas una tras otra para que dos toques seguidos no creen dos sesiones. */
function serialize<T>(lock: { current: Promise<unknown> }, task: () => Promise<T>): Promise<T> {
  const run = lock.current.then(task, task);
  lock.current = run.catch(() => undefined);
  return run;
}

export type NewExercise = {
  name: string;
  group: MuscleGroup;
  equipment: Equipment;
  kind: ExerciseKind;
};

export function useGym(accountId: string, accountName: string) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<LiftEntry[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [customs, setCustoms] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Solo se usa como nombre de respaldo al cargar; renombrar no debe recargar todo.
  const fallbackName = useRef(accountName);

  // Copias síncronas para decidir sin esperar al siguiente render.
  const entriesRef = useRef<LiftEntry[]>([]);
  const sessionsRef = useRef<WorkoutSession[]>([]);
  const lock = useRef<Promise<unknown>>(Promise.resolve());

  const commitEntries = useCallback((next: LiftEntry[]) => {
    entriesRef.current = next;
    setEntries(next);
  }, []);

  const commitSessions = useCallback((next: WorkoutSession[]) => {
    sessionsRef.current = next;
    setSessions(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedProfile, storedEntries, storedSessions, storedCustoms] = await Promise.all([
          loadProfile(accountId),
          loadLifts(accountId),
          loadSessions(accountId),
          loadCustomExercises(accountId),
        ]);

        let nextProfile = storedProfile;
        if (!nextProfile) {
          // No debería pasar (la cuenta se crea con su perfil); por si acaso.
          const iso = new Date().toISOString();
          nextProfile = {
            name: fallbackName.current,
            sex: "male",
            bodyweightKg: 75,
            createdAt: iso,
            updatedAt: iso,
          };
          await saveProfile(accountId, nextProfile);
        }

        // Una sesión abierta que quedó olvidada (>6 h sin series) se cierra sola.
        let nextSessions = storedSessions;
        const open = storedSessions.find((item) => !item.endedAt);
        if (open) {
          const last = lastActivityMs(open, storedEntries);
          if (isStale(last, Date.now())) {
            const closed: WorkoutSession = { ...open, endedAt: new Date(last).toISOString() };
            await saveWorkoutSession(closed);
            nextSessions = storedSessions.map((item) => (item.id === open.id ? closed : item));
          }
        }

        if (cancelled) return;
        setProfile(nextProfile);
        commitEntries(storedEntries);
        commitSessions(nextSessions);
        setCustoms(storedCustoms);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error al cargar tus datos");
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, commitEntries, commitSessions]);

  const exercises = useMemo(() => [...EXERCISES, ...customs], [customs]);
  const customMap = useMemo(() => new Map(customs.map((item) => [item.id, item])), [customs]);
  const getExercise = useCallback(
    (id: LiftId): Exercise | undefined => EXERCISE_MAP.get(id) ?? customMap.get(id),
    [customMap],
  );

  const snapshot = useMemo(
    () => computeSnapshot(profile, entries, getExercise),
    [profile, entries, getExercise],
  );

  const activeSession = useMemo(
    () => sessions.find((item) => !item.endedAt) ?? null,
    [sessions],
  );

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
      await saveProfile(accountId, next);
      setProfile(next);
    },
    [accountId, profile],
  );

  /** Devuelve la sesión abierta, o cierra la abandonada y abre una nueva. */
  const ensureSession = useCallback(
    async (now: number): Promise<WorkoutSession> => {
      const open = sessionsRef.current.find((item) => !item.endedAt);
      let list = sessionsRef.current;

      if (open) {
        const last = lastActivityMs(open, entriesRef.current);
        if (!isStale(last, now)) return open;
        const closed: WorkoutSession = { ...open, endedAt: new Date(last).toISOString() };
        await saveWorkoutSession(closed);
        list = list.map((item) => (item.id === open.id ? closed : item));
      }

      const fresh: WorkoutSession = {
        id: newId(),
        accountId,
        startedAt: new Date(now).toISOString(),
        endedAt: null,
      };
      await saveWorkoutSession(fresh);
      commitSessions([fresh, ...list]);
      return fresh;
    },
    [accountId, commitSessions],
  );

  const startSession = useCallback(
    () => serialize(lock, () => ensureSession(Date.now())),
    [ensureSession],
  );

  const endSession = useCallback(
    () =>
      serialize(lock, async () => {
        const open = sessionsRef.current.find((item) => !item.endedAt);
        if (!open) return;
        const closed: WorkoutSession = { ...open, endedAt: new Date().toISOString() };
        await saveWorkoutSession(closed);
        commitSessions(sessionsRef.current.map((item) => (item.id === open.id ? closed : item)));
      }),
    [commitSessions],
  );

  const logLift = useCallback(
    (input: { lift: LiftId; weightKg: number; reps: number }) =>
      serialize(lock, async (): Promise<{ entry: LiftEntry; record: RecordEvent | null }> => {
        const now = Date.now();
        const session = await ensureSession(now);
        const entry: LiftEntry = {
          id: newId(),
          accountId,
          sessionId: session.id,
          lift: input.lift,
          weightKg: input.weightKg,
          reps: input.reps,
          estimated1rm: estimateOneRm(getExercise(input.lift), input.weightKg, input.reps),
          date: new Date(now).toISOString(),
        };
        const before = entriesRef.current;
        await addLift(entry);
        commitEntries([entry, ...before]);
        const record = profile ? detectRecord(profile, before, entry, getExercise) : null;
        return { entry, record };
      }),
    [accountId, commitEntries, ensureSession, getExercise, profile],
  );

  const removeLift = useCallback(
    async (id: string) => {
      await deleteLift(id);
      commitEntries(entriesRef.current.filter((entry) => entry.id !== id));
    },
    [commitEntries],
  );

  const addCustomExercise = useCallback(
    async (input: NewExercise): Promise<Exercise> => {
      const name = input.name.trim().replace(/\s+/g, " ").slice(0, 60);
      if (name.length < 2) throw new Error("Escribe el nombre del ejercicio.");
      const key = normalizeText(name);
      const clash = [...EXERCISES, ...customs].find((item) => normalizeText(item.name) === key);
      if (clash) throw new Error(`Ya existe "${clash.name}". Búscalo en la lista.`);

      const exercise: Exercise = {
        id: `custom:${newId()}`,
        name,
        group: input.group,
        equipment: input.equipment,
        kind: input.kind,
        ...(input.kind === "timed" ? { unit: "min" as const } : {}),
        custom: true,
      };
      await saveCustomExercise(accountId, exercise);
      setCustoms((prev) => [...prev, exercise]);
      return exercise;
    },
    [accountId, customs],
  );

  return {
    ready,
    error,
    profile,
    entries,
    sessions,
    activeSession,
    exercises,
    getExercise,
    snapshot,
    upsertProfile,
    startSession,
    endSession,
    logLift,
    removeLift,
    addCustomExercise,
  };
}
