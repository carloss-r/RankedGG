"use client";

import { useState } from "react";
import { LIFT_META, LIFTS } from "../../lib/standards";
import type { LiftEntry, LiftId } from "../../lib/types";
import { Glass, PrimaryButton } from "../ui";

export function LogScreen({
  entries,
  onLog,
  onDelete,
}: {
  entries: LiftEntry[];
  onLog: (input: { lift: LiftId; weightKg: number; reps: number }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [lift, setLift] = useState<LiftId>("squat");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("1");
  const [busy, setBusy] = useState(false);

  async function save() {
    const weightKg = Number(weight.replace(",", "."));
    const repsN = Number(reps);
    if (!Number.isFinite(weightKg) || weightKg <= 0) return;
    if (!Number.isFinite(repsN) || repsN < 1 || repsN > 30) return;
    setBusy(true);
    await onLog({ lift, weightKg, reps: repsN });
    setWeight("");
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] tracking-[0.18em] text-white/45 uppercase">Actualizar</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Marcas</h1>
      </header>

      <Glass className="px-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          {LIFTS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setLift(id)}
              className={`h-12 rounded-2xl text-[14px] ${
                lift === id ? "bg-white text-black" : "bg-white/6 text-white/80"
              }`}
            >
              {LIFT_META[id].short}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label>
            <span className="mb-2 block text-[11px] tracking-[0.14em] text-white/45 uppercase">
              Peso
            </span>
            <input
              value={weight}
              inputMode="decimal"
              placeholder="kg"
              onChange={(event) => setWeight(event.target.value)}
              className="h-16 w-full rounded-2xl bg-white/8 text-center text-[28px] outline-none"
            />
          </label>
          <label>
            <span className="mb-2 block text-[11px] tracking-[0.14em] text-white/45 uppercase">
              Reps
            </span>
            <input
              value={reps}
              inputMode="numeric"
              onChange={(event) => setReps(event.target.value)}
              className="h-16 w-full rounded-2xl bg-white/8 text-center text-[28px] outline-none"
            />
          </label>
        </div>
        <div className="mt-4">
          <PrimaryButton onClick={save} disabled={busy}>
            Guardar marca
          </PrimaryButton>
        </div>
      </Glass>

      <div className="flex flex-col gap-2">
        {entries.slice(0, 10).map((entry) => (
          <Glass key={entry.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-[15px] font-medium">
                {LIFT_META[entry.lift].short} · {entry.weightKg} kg × {entry.reps}
              </p>
              <p className="text-[12px] text-white/45">
                {new Date(entry.date).toLocaleString("es", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDelete(entry.id)}
              className="text-[13px] text-white/45"
            >
              Borrar
            </button>
          </Glass>
        ))}
      </div>
    </div>
  );
}
