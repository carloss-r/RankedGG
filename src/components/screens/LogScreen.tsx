"use client";

import { useEffect, useMemo, useState } from "react";
import type { NewExercise } from "../../hooks/useGym";
import { formatClock, formatSet, parseNumber } from "../../lib/format";
import {
  EQUIPMENT_LABELS,
  GROUP_LABELS,
  shortName,
} from "../../lib/exercises";
import { groupBySession, sessionDurationMs } from "../../lib/sessions";
import { LIFT_META } from "../../lib/standards";
import type { Exercise, LiftEntry, LiftId, WorkoutSession } from "../../lib/types";
import { ExercisePicker } from "../ExercisePicker";
import { ErrorNote, Glass, PrimaryButton, SuccessNote } from "../ui";

const MAX_GROUPS = 20;

function defaultReps(exercise: Exercise | undefined): string {
  if (!exercise) return "1";
  if (exercise.kind === "timed") return exercise.unit === "min" ? "30" : "60";
  if (exercise.kind === "bodyweight") return "10";
  return "1";
}

export function LogScreen({
  entries,
  sessions,
  activeSession,
  exercises,
  getExercise,
  onLog,
  onDelete,
  onStart,
  onEnd,
  onCreateExercise,
}: {
  entries: LiftEntry[];
  sessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  exercises: Exercise[];
  getExercise: (id: LiftId) => Exercise | undefined;
  onLog: (input: { lift: LiftId; weightKg: number; reps: number }) => Promise<LiftEntry>;
  onDelete: (id: string) => Promise<void>;
  onStart: () => Promise<WorkoutSession>;
  onEnd: () => Promise<void>;
  onCreateExercise: (input: NewExercise) => Promise<Exercise>;
}) {
  const [exerciseId, setExerciseId] = useState<LiftId>("squat");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("1");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  // Reloj para el cronómetro de la sesión en curso (no se lee la hora durante el render).
  const [now, setNow] = useState(0);

  const exercise = getExercise(exerciseId) ?? getExercise("squat");
  const kind = exercise?.kind ?? "weight";
  const isTimed = kind === "timed";
  const isBodyweight = kind === "bodyweight";
  const timeInMinutes = exercise?.unit === "min";

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  const recentIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const entry of entries) {
      if (seen.has(entry.lift)) continue;
      seen.add(entry.lift);
      ids.push(entry.lift);
      if (ids.length >= 8) break;
    }
    return ids;
  }, [entries]);

  const groups = useMemo(
    () =>
      groupBySession(entries, sessions)
        .filter((group) => group.active || group.entries.length > 0)
        .slice(0, MAX_GROUPS),
    [entries, sessions],
  );
  const activeGroup = groups.find((group) => group.active) ?? null;

  function selectExercise(id: LiftId) {
    setExerciseId(id);
    setWeight("");
    setReps(defaultReps(getExercise(id)));
    setError(null);
    setNotice(null);
    setPickerOpen(false);
  }

  async function save() {
    if (!exercise) return;
    setError(null);
    setNotice(null);

    let weightKg = 0;
    let repsN: number;

    if (isTimed) {
      const value = parseNumber(reps);
      if (!Number.isFinite(value) || value <= 0) {
        setError(timeInMinutes ? "Indica cuántos minutos." : "Indica cuántos segundos.");
        return;
      }
      repsN = Math.round(timeInMinutes ? value * 60 : value);
    } else {
      weightKg = weight.trim() === "" ? 0 : parseNumber(weight);
      if (!Number.isFinite(weightKg) || weightKg < 0) {
        setError("El peso no es válido.");
        return;
      }
      if (!isBodyweight && weightKg <= 0) {
        setError("Indica el peso en kg.");
        return;
      }
      repsN = Math.round(parseNumber(reps));
      const maxReps = isBodyweight ? 500 : 50;
      if (!Number.isFinite(repsN) || repsN < 1 || repsN > maxReps) {
        setError(`Las repeticiones deben estar entre 1 y ${maxReps}.`);
        return;
      }
    }

    setBusy(true);
    try {
      await onLog({ lift: exerciseId, weightKg, reps: repsN });
      setNotice("Serie guardada");
      window.setTimeout(() => setNotice(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la serie.");
    } finally {
      setBusy(false);
    }
  }

  async function runSession(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la sesión.");
    }
  }

  const weightLabel = isBodyweight
    ? "Peso extra (kg)"
    : exercise?.equipment === "dumbbell"
      ? "Por mancuerna (kg)"
      : "Peso (kg)";

  let scoreHint = "";
  if (exercise) {
    if (exercise.core) scoreHint = "Ejercicio base: cuenta para tu rango.";
    else if (exercise.ref)
      scoreHint = `Cuenta para tu rango (estimado a partir de ${LIFT_META[exercise.ref.lift].name.toLowerCase()}).`;
    else scoreHint = "Se registra y se grafica, pero no cuenta para el rango.";
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] tracking-[0.18em] text-white/45 uppercase">Entrenar</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Marcas</h1>
      </header>

      <Glass className="px-4 py-4">
        {activeGroup ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] tracking-[0.14em] text-emerald-300 uppercase">
                Sesión en curso
              </p>
              <p className="mt-1 text-[17px] font-medium">
                {formatClock(sessionDurationMs(activeGroup, now))} · {activeGroup.entries.length}{" "}
                {activeGroup.entries.length === 1 ? "serie" : "series"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void runSession(onEnd)}
              className="h-11 shrink-0 rounded-full border border-white/20 px-5 text-[14px] text-white/85"
            >
              Terminar
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[14px] leading-5 text-white/60">
              Tus series se agrupan por sesión. Se abre una sola al guardar la primera.
            </p>
            <button
              type="button"
              onClick={() => void runSession(onStart)}
              className="h-11 shrink-0 rounded-full bg-white/10 px-5 text-[14px] text-white"
            >
              Iniciar
            </button>
          </div>
        )}
      </Glass>

      {pickerOpen ? (
        <ExercisePicker
          exercises={exercises}
          selectedId={exerciseId}
          recentIds={recentIds}
          onSelect={selectExercise}
          onCreate={onCreateExercise}
          onClose={() => setPickerOpen(false)}
        />
      ) : (
        <Glass className="px-4 py-4">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/8 px-4 py-3 text-left"
            aria-label="Cambiar ejercicio"
          >
            <span className="min-w-0">
              <span className="block text-[11px] tracking-[0.14em] text-white/45 uppercase">
                Ejercicio
              </span>
              <span className="block truncate text-[18px] font-semibold">
                {exercise ? exercise.name : "Elegir"}
              </span>
              {exercise && (
                <span className="block text-[12px] text-white/45">
                  {GROUP_LABELS[exercise.group]} · {EQUIPMENT_LABELS[exercise.equipment]}
                </span>
              )}
            </span>
            <span className="shrink-0 text-[13px] text-white/55">Cambiar</span>
          </button>

          {recentIds.length > 0 && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {recentIds.slice(0, 6).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectExercise(id)}
                  className={`h-9 shrink-0 rounded-full px-4 text-[13px] ${
                    id === exerciseId ? "bg-white text-black" : "bg-white/8 text-white/75"
                  }`}
                >
                  {shortName(id, getExercise(id))}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            {!isTimed && (
              <label>
                <span className="mb-2 block text-[11px] tracking-[0.14em] text-white/45 uppercase">
                  {weightLabel}
                </span>
                <input
                  value={weight}
                  inputMode="decimal"
                  placeholder={isBodyweight ? "0" : "kg"}
                  onChange={(event) => setWeight(event.target.value)}
                  className="h-16 w-full rounded-2xl bg-white/8 text-center text-[28px] outline-none"
                />
              </label>
            )}
            <label className={isTimed ? "col-span-2" : ""}>
              <span className="mb-2 block text-[11px] tracking-[0.14em] text-white/45 uppercase">
                {isTimed ? (timeInMinutes ? "Minutos" : "Segundos") : "Reps"}
              </span>
              <input
                value={reps}
                inputMode={isTimed ? "decimal" : "numeric"}
                onChange={(event) => setReps(event.target.value)}
                className="h-16 w-full rounded-2xl bg-white/8 text-center text-[28px] outline-none"
              />
            </label>
          </div>

          {scoreHint && <p className="mt-3 px-1 text-[12px] leading-5 text-white/45">{scoreHint}</p>}

          <div className="mt-4 flex flex-col gap-3">
            {error && <ErrorNote>{error}</ErrorNote>}
            {notice && <SuccessNote>{notice}</SuccessNote>}
            <PrimaryButton onClick={save} disabled={busy}>
              Guardar serie
            </PrimaryButton>
          </div>
        </Glass>
      )}

      <div className="flex flex-col gap-3">
        {groups.length === 0 && (
          <Glass className="px-5 py-8 text-center text-[15px] text-white/55">
            Aún no hay series. Guarda la primera y empieza tu historial.
          </Glass>
        )}
        {groups.map((group) => {
          const open = group.active || openId === group.session.id;
          const day = new Date(group.session.startedAt);
          const duration = sessionDurationMs(group, now);
          const distinct = new Set(group.entries.map((entry) => entry.lift)).size;
          return (
            <Glass key={group.session.id} className="px-4 py-4">
              <button
                type="button"
                onClick={() =>
                  group.active ? undefined : setOpenId(open ? null : group.session.id)
                }
                className="flex w-full items-start justify-between gap-3 text-left"
                aria-expanded={open}
              >
                <span>
                  <span className="block text-[16px] font-semibold capitalize">
                    {day.toLocaleDateString("es", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                    <span className="ml-2 text-[13px] font-normal text-white/45 normal-case">
                      {day.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[13px] text-white/50">
                    {group.session.title ? `${group.session.title} · ` : ""}
                    {group.entries.length} {group.entries.length === 1 ? "serie" : "series"} ·{" "}
                    {distinct} {distinct === 1 ? "ejercicio" : "ejercicios"}
                    {duration >= 60_000 ? ` · ${formatClock(duration)}` : ""}
                  </span>
                </span>
                {group.active ? (
                  <span className="shrink-0 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200">
                    En curso
                  </span>
                ) : (
                  <span className="shrink-0 text-[13px] text-white/45">{open ? "Ocultar" : "Ver"}</span>
                )}
              </button>

              {open && (
                <div className="mt-3 flex flex-col gap-1.5">
                  {group.entries.length === 0 && (
                    <p className="px-1 py-2 text-[13px] text-white/45">Sin series todavía.</p>
                  )}
                  {group.entries.map((entry) => {
                    const ex = getExercise(entry.lift);
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-white/6 px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium">
                            {ex ? ex.name : "Ejercicio eliminado"}
                          </p>
                          <p className="text-[12px] text-white/50">
                            {formatSet(entry, ex)} ·{" "}
                            {new Date(entry.date).toLocaleTimeString("es", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("¿Borrar esta serie?")) void onDelete(entry.id);
                          }}
                          className="shrink-0 text-[13px] text-white/45"
                        >
                          Borrar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Glass>
          );
        })}
      </div>
    </div>
  );
}
