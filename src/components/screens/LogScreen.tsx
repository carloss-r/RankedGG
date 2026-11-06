"use client";

import { useMemo, useState } from "react";
import type { NewExercise } from "../../hooks/useGym";
import { formatKg, liftStanding } from "../../lib/engine";
import { formatSet, parseNumber } from "../../lib/format";
import {
  EQUIPMENT_LABELS,
  estimateOneRm,
  GROUP_LABELS,
  shortName,
} from "../../lib/exercises";
import { groupBySession } from "../../lib/sessions";
import { LIFT_META } from "../../lib/standards";
import type {
  Exercise,
  LiftEntry,
  LiftId,
  Profile,
  RecordEvent,
  WorkoutSession,
} from "../../lib/types";
import { ExercisePicker } from "../ExercisePicker";
import { RankBadge } from "../RankBadge";
import { ErrorNote, Glass, PrimaryButton } from "../ui";

const MAX_GROUPS = 20;

function defaultReps(exercise: Exercise | undefined): string {
  if (!exercise) return "1";
  if (exercise.kind === "timed") return exercise.unit === "min" ? "30" : "60";
  if (exercise.kind === "bodyweight") return "10";
  return "1";
}

function fmtNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(date)) / 86_400_000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return date.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" });
}

function Stepper({
  label,
  value,
  onChange,
  step,
  min,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: number;
  min: number;
  placeholder?: string;
  inputMode: "decimal" | "numeric";
}) {
  const bump = (direction: 1 | -1) => {
    const current = value.trim() === "" ? 0 : parseNumber(value);
    const base = Number.isFinite(current) ? current : 0;
    const next = Math.max(min, Math.round((base + direction * step) * 100) / 100);
    onChange(fmtNumber(next));
  };
  return (
    <div>
      <span className="mb-2 block text-center text-[11px] tracking-[0.14em] text-white/45 uppercase">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`Menos ${label.toLowerCase()}`}
          onClick={() => bump(-1)}
          className="flex h-16 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-[24px] text-white/80 active:bg-white/15"
        >
          −
        </button>
        <input
          aria-label={label}
          value={value}
          inputMode={inputMode}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="h-16 min-w-0 flex-1 rounded-2xl bg-white/8 text-center text-[28px] font-semibold outline-none"
        />
        <button
          type="button"
          aria-label={`Más ${label.toLowerCase()}`}
          onClick={() => bump(1)}
          className="flex h-16 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-[24px] text-white/80 active:bg-white/15"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function LogScreen({
  profile,
  entries,
  sessions,
  exercises,
  getExercise,
  onLog,
  onDelete,
  onRecord,
  onCreateExercise,
}: {
  profile: Profile;
  entries: LiftEntry[];
  sessions: WorkoutSession[];
  exercises: Exercise[];
  getExercise: (id: LiftId) => Exercise | undefined;
  onLog: (input: {
    lift: LiftId;
    weightKg: number;
    reps: number;
  }) => Promise<{ entry: LiftEntry; record: RecordEvent | null }>;
  onDelete: (id: string) => Promise<void>;
  onRecord: (record: RecordEvent) => void;
  onCreateExercise: (input: NewExercise) => Promise<Exercise>;
}) {
  const lastOf = (id: LiftId) => entries.find((entry) => entry.lift === id);

  const [exerciseId, setExerciseId] = useState<LiftId>(() => entries[0]?.lift ?? "squat");
  const [weight, setWeight] = useState(() => {
    const last = entries[0];
    return last && last.weightKg > 0 ? fmtNumber(last.weightKg) : "";
  });
  const [reps, setReps] = useState(() => {
    const last = entries[0];
    if (!last) return "1";
    const ex = getExercise(last.lift);
    return ex?.kind === "timed" ? defaultReps(ex) : String(last.reps);
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const exercise = getExercise(exerciseId) ?? getExercise("squat");
  const kind = exercise?.kind ?? "weight";
  const isTimed = kind === "timed";
  const isBodyweight = kind === "bodyweight";
  const timeInMinutes = exercise?.unit === "min";

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
    () => groupBySession(entries, sessions).filter((group) => group.entries.length > 0).slice(0, MAX_GROUPS),
    [entries, sessions],
  );

  const last = lastOf(exerciseId);
  const bestKg = useMemo(
    () => entries.filter((e) => e.lift === exerciseId).reduce((m, e) => Math.max(m, e.estimated1rm), 0),
    [entries, exerciseId],
  );

  function selectExercise(id: LiftId) {
    const next = getExercise(id);
    const previous = entries.find((entry) => entry.lift === id);
    setExerciseId(id);
    setWeight(previous && previous.weightKg > 0 && next?.kind !== "timed" ? fmtNumber(previous.weightKg) : "");
    setReps(
      previous && next?.kind !== "timed" ? String(previous.reps) : defaultReps(next),
    );
    setError(null);
    setNotice(null);
    setPickerOpen(false);
  }

  function parseInputs(): { weightKg: number; reps: number } | string {
    if (isTimed) {
      const value = parseNumber(reps);
      if (!Number.isFinite(value) || value <= 0) {
        return timeInMinutes ? "Indica cuántos minutos." : "Indica cuántos segundos.";
      }
      return { weightKg: 0, reps: Math.round(timeInMinutes ? value * 60 : value) };
    }
    const weightKg = weight.trim() === "" ? 0 : parseNumber(weight);
    if (!Number.isFinite(weightKg) || weightKg < 0) return "El peso no es válido.";
    if (!isBodyweight && weightKg <= 0) return "Indica el peso en kg.";
    const repsN = Math.round(parseNumber(reps));
    const maxReps = isBodyweight ? 500 : 50;
    if (!Number.isFinite(repsN) || repsN < 1 || repsN > maxReps) {
      return `Las repeticiones deben estar entre 1 y ${maxReps}.`;
    }
    return { weightKg, reps: repsN };
  }

  // Vista previa: qué 1RM y qué rango daría esta serie, y si sería marca personal.
  const preview = useMemo(() => {
    if (!exercise || isTimed) return null;
    const w = weight.trim() === "" ? 0 : parseNumber(weight);
    const r = Math.round(parseNumber(reps));
    if (!Number.isFinite(w) || !Number.isFinite(r) || r < 1 || w <= 0) return null;
    const oneRm = estimateOneRm(exercise, w, r);
    if (oneRm <= 0) return null;
    return {
      oneRm,
      standing: liftStanding(profile, exerciseId, exercise, oneRm),
      isRecord: oneRm > bestKg + 1e-9,
    };
  }, [exercise, isTimed, weight, reps, profile, exerciseId, bestKg]);

  async function save() {
    if (!exercise) return;
    setError(null);
    setNotice(null);
    const parsed = parseInputs();
    if (typeof parsed === "string") {
      setError(parsed);
      return;
    }
    setBusy(true);
    try {
      const { record } = await onLog({ lift: exerciseId, ...parsed });
      if (record) {
        onRecord(record);
      } else {
        setNotice("Marca guardada");
        window.setTimeout(() => setNotice(null), 2500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la marca.");
    } finally {
      setBusy(false);
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
        <p className="text-[13px] tracking-[0.18em] text-white/45 uppercase">Anota tu marca</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Marcas</h1>
      </header>

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

          <div className={`mt-4 grid gap-3 ${isTimed ? "grid-cols-1" : "grid-cols-2"}`}>
            {!isTimed && (
              <Stepper
                label={weightLabel}
                value={weight}
                onChange={setWeight}
                step={isBodyweight ? 1 : 2.5}
                min={0}
                placeholder={isBodyweight ? "0" : "kg"}
                inputMode="decimal"
              />
            )}
            <Stepper
              label={isTimed ? (timeInMinutes ? "Minutos" : "Segundos") : "Reps"}
              value={reps}
              onChange={setReps}
              step={isTimed ? (timeInMinutes ? 5 : 10) : 1}
              min={isTimed ? 0 : 1}
              inputMode={isTimed ? "decimal" : "numeric"}
            />
          </div>

          <div className="mt-3 min-h-[44px] px-1 text-[13px] leading-5 text-white/50">
            {preview ? (
              <div className="flex items-center gap-2.5">
                {preview.standing && (
                  <RankBadge rankId={preview.standing.rank.id} size={34} />
                )}
                <p>
                  1RM estimado <span className="font-semibold text-white/85">{formatKg(preview.oneRm)}</span>
                  {preview.standing ? ` · ${preview.standing.label}` : ""}
                  {preview.isRecord && (
                    <span className="ml-2 rounded-full bg-amber-300/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                      {bestKg > 0 ? "¡Sería marca personal!" : "¡Tu primera marca!"}
                    </span>
                  )}
                </p>
              </div>
            ) : last ? (
              <p>
                Última: {formatSet(last, exercise)}
                {bestKg > 0 ? ` · Mejor 1RM ${formatKg(bestKg)}` : ""}
              </p>
            ) : (
              <p>{scoreHint}</p>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {error && <ErrorNote>{error}</ErrorNote>}
            {notice && (
              <p role="status" className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-[14px] text-emerald-200">
                {notice}
              </p>
            )}
            <PrimaryButton onClick={save} disabled={busy}>
              Guardar marca
            </PrimaryButton>
            {(preview || last) && scoreHint && (
              <p className="px-1 text-center text-[12px] leading-5 text-white/40">{scoreHint}</p>
            )}
          </div>
        </Glass>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="px-1 text-[12px] tracking-[0.16em] text-white/45 uppercase">Historial</h2>
        {groups.length === 0 && (
          <Glass className="px-5 py-8 text-center text-[15px] text-white/55">
            Aún no hay marcas. Guarda la primera y empieza tu historial.
          </Glass>
        )}
        {groups.map((group, index) => {
          const open = index === 0 || openId === group.session.id;
          const distinct = new Set(group.entries.map((entry) => entry.lift)).size;
          return (
            <Glass key={group.session.id} className="px-4 py-4">
              <button
                type="button"
                onClick={() => (index === 0 ? undefined : setOpenId(open ? null : group.session.id))}
                className="flex w-full items-start justify-between gap-3 text-left"
                aria-expanded={open}
              >
                <span>
                  <span className="block text-[16px] font-semibold capitalize">
                    {dayLabel(group.session.startedAt)}
                    <span className="ml-2 text-[13px] font-normal text-white/45 normal-case">
                      {new Date(group.session.startedAt).toLocaleTimeString("es", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[13px] text-white/50">
                    {group.entries.length} {group.entries.length === 1 ? "marca" : "marcas"} · {distinct}{" "}
                    {distinct === 1 ? "ejercicio" : "ejercicios"}
                  </span>
                </span>
                {index !== 0 && (
                  <span className="shrink-0 text-[13px] text-white/45">{open ? "Ocultar" : "Ver"}</span>
                )}
              </button>

              {open && (
                <div className="mt-3 flex flex-col gap-1.5">
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
                            if (window.confirm("¿Borrar esta marca?")) void onDelete(entry.id);
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
