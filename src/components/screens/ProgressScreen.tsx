"use client";

import { useMemo, useState } from "react";
import { variantById } from "../../lib/catalog";
import { equivalent1rm, formatKg } from "../../lib/engine";
import { LIFT_META, LIFTS } from "../../lib/standards";
import type { LiftEntry, LiftId } from "../../lib/types";
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

export function ProgressScreen({ entries }: { entries: LiftEntry[] }) {
  const [lift, setLift] = useState<LiftId>("squat");
  const series = useMemo(() => {
    return entries
      .filter((entry) => entry.lift === lift)
      .slice()
      .reverse();
  }, [entries, lift]);
  // La curva usa el 1RM equivalente al ejercicio base para poder mezclar variantes.
  const values = series.map((entry) => equivalent1rm(entry));
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  const delta = last - first;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] tracking-[0.18em] text-white/45 uppercase">Historial</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Progreso</h1>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {LIFTS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setLift(id)}
            className={`h-10 shrink-0 rounded-full px-4 text-[14px] ${
              lift === id ? "bg-white text-black" : "glass text-white/80"
            }`}
          >
            {LIFT_META[id].short}
          </button>
        ))}
      </div>

      <Glass className="px-4 py-5">
        <div className="flex items-end justify-between px-1">
          <div>
            <p className="text-[13px] text-white/50">1RM equivalente</p>
            <p className="text-[34px] font-semibold">{formatKg(last)}</p>
          </div>
          <p className={`text-[15px] ${delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {delta === 0 ? "Sin cambio" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`}
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
        {series.length === 0 && (
          <Glass className="px-5 py-8 text-center text-[15px] text-white/55">
            Aún no hay registros de {LIFT_META[lift].name.toLowerCase()}.
          </Glass>
        )}
        {series
          .slice()
          .reverse()
          .slice(0, 12)
          .map((entry) => (
            <Glass key={entry.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[16px] font-medium">
                  {entry.weightKg} kg × {entry.reps}
                  <span className="ml-2 text-[12px] text-white/45">
                    {variantById(entry.lift, entry.variantId).name}
                  </span>
                </p>
                <p className="text-[12px] text-white/45">
                  {new Date(entry.date).toLocaleDateString("es", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              <p className="text-[14px] text-white/60">1RM {formatKg(equivalent1rm(entry))}</p>
            </Glass>
          ))}
      </div>
    </div>
  );
}
