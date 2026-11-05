"use client";

import { useMemo, useState } from "react";
import { formatKg } from "../../lib/engine";
import { shortName } from "../../lib/exercises";
import { formatSeconds, formatSet } from "../../lib/format";
import { LIFTS } from "../../lib/standards";
import type { Exercise, LiftEntry, LiftId } from "../../lib/types";
import { Glass } from "../ui";

function sparkPoints(values: number[], width: number, height: number) {
  if (values.length === 0) return "";
  const min = Math.min(...values) * 0.96;
  const max = Math.max(...values) * 1.04;
  const span = max - min || 1;
  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

type Metric = {
  label: string;
  value: (entry: LiftEntry) => number;
  format: (value: number) => string;
};

function oneDecimal(value: number) {
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} kg`;
}

/** Qué se grafica según cómo se mide el ejercicio. */
function metricFor(exercise: Exercise | undefined, entries: LiftEntry[]): Metric {
  const kind = exercise?.kind ?? "weight";
  if (kind === "timed") {
    return { label: "Mejor duración", value: (entry) => entry.reps, format: formatSeconds };
  }
  if (kind === "bodyweight" && !entries.some((entry) => entry.weightKg > 0)) {
    return {
      label: "Máximo de repeticiones",
      value: (entry) => entry.reps,
      format: (value) => `${value} reps`,
    };
  }
  return {
    label: "Mejor 1RM estimado",
    value: (entry) => entry.estimated1rm,
    format: oneDecimal,
  };
}

export function ProgressScreen({
  entries,
  getExercise,
}: {
  entries: LiftEntry[];
  getExercise: (id: LiftId) => Exercise | undefined;
}) {
  const [lift, setLift] = useState<LiftId>("squat");

  // Los 8 base siempre; los demás, solo los que ya tienen registros.
  const chips = useMemo(() => {
    const extras: LiftId[] = [];
    for (const entry of entries) {
      if (!(LIFTS as string[]).includes(entry.lift) && !extras.includes(entry.lift)) {
        extras.push(entry.lift);
      }
    }
    return [...LIFTS, ...extras] as LiftId[];
  }, [entries]);

  const exercise = getExercise(lift);
  const raw = useMemo(
    () => entries.filter((entry) => entry.lift === lift).slice().reverse(),
    [entries, lift],
  );
  const metric = metricFor(exercise, raw);
  const series = raw.filter((entry) => metric.value(entry) > 0);
  const values = series.map(metric.value);
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const best = values.length > 0 ? Math.max(...values) : 0;
  const delta = last - first;
  const showOneRm = metric.label === "Mejor 1RM estimado";

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] tracking-[0.18em] text-white/45 uppercase">Historial</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Progreso</h1>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {chips.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setLift(id)}
            className={`h-10 shrink-0 rounded-full px-4 text-[14px] ${
              lift === id ? "bg-white text-black" : "glass text-white/80"
            }`}
          >
            {shortName(id, getExercise(id))}
          </button>
        ))}
      </div>

      <Glass className="px-4 py-5">
        <div className="flex items-end justify-between px-1">
          <div>
            <p className="text-[13px] text-white/50">{metric.label}</p>
            <p className="text-[34px] font-semibold">
              {best > 0 ? (showOneRm ? formatKg(best) : metric.format(best)) : "—"}
            </p>
          </div>
          <p className={`text-[15px] ${delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {delta === 0 ? "Sin cambio" : `${delta > 0 ? "+" : "−"}${metric.format(Math.abs(delta))}`}
          </p>
        </div>
        <svg viewBox="0 0 320 120" className="mt-4 h-32 w-full">
          <polyline
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={sparkPoints(values, 320, 120)}
          />
        </svg>
        {values.length < 2 && (
          <p className="px-1 text-[13px] text-white/50">
            Registra más marcas para ver la curva de progreso.
          </p>
        )}
      </Glass>

      <div className="flex flex-col gap-2">
        {raw.length === 0 && (
          <Glass className="px-5 py-8 text-center text-[15px] text-white/55">
            Aún no hay registros de {(exercise?.name ?? "este ejercicio").toLowerCase()}.
          </Glass>
        )}
        {raw
          .slice()
          .reverse()
          .slice(0, 12)
          .map((entry) => (
            <Glass key={entry.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[16px] font-medium">{formatSet(entry, exercise)}</p>
                <p className="text-[12px] text-white/45">
                  {new Date(entry.date).toLocaleDateString("es", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              {showOneRm && entry.estimated1rm > 0 && (
                <p className="text-[14px] text-white/60">1RM {formatKg(entry.estimated1rm)}</p>
              )}
            </Glass>
          ))}
      </div>
    </div>
  );
}
