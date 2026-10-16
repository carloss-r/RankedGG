"use client";

import { useState } from "react";
import { baseVariant, exerciseById, variantById, variantsOf } from "../../lib/catalog";
import { equivalent1rm, formatKg } from "../../lib/engine";
import { LIFT_META, LIFTS } from "../../lib/standards";
import type { LiftEntry, LiftId } from "../../lib/types";
import { Glass, PrimaryButton } from "../ui";

export function LogScreen({
  entries,
  onLog,
  onDelete,
}: {
  entries: LiftEntry[];
  onLog: (input: {
    lift: LiftId;
    variantId: string;
    weightKg: number;
    reps: number;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [lift, setLift] = useState<LiftId>("squat");
  const [variantId, setVariantId] = useState(baseVariant("squat").id);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("1");
  const [busy, setBusy] = useState(false);

  const variants = variantsOf(lift);
  const variant = variantById(lift, variantId);

  function pickLift(id: LiftId) {
    setLift(id);
    setVariantId(baseVariant(id).id);
  }

  async function save() {
    const weightKg = Number(weight.replace(",", "."));
    const repsN = Number(reps);
    if (!Number.isFinite(weightKg) || weightKg <= 0) return;
    if (!Number.isFinite(repsN) || repsN < 1 || repsN > 30) return;
    setBusy(true);
    await onLog({ lift, variantId: variant.id, weightKg, reps: repsN });
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
              onClick={() => pickLift(id)}
              className={`h-12 rounded-2xl text-[14px] ${
                lift === id ? "bg-white text-black" : "bg-white/6 text-white/80"
              }`}
            >
              {LIFT_META[id].short}
            </button>
          ))}
        </div>

        {variants.length > 1 && (
          <div className="mt-4">
            <span className="mb-2 block text-[11px] tracking-[0.14em] text-white/45 uppercase">
              Variante
            </span>
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {variants.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setVariantId(item.id)}
                  className={`h-10 shrink-0 rounded-full px-4 text-[13px] ${
                    variant.id === item.id ? "bg-white text-black" : "bg-white/8 text-white/80"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
            {variant.note && (
              <p className="mt-2 px-1 text-[12px] text-white/50">{variant.note}.</p>
            )}
            {variant.factor !== 1 && (
              <p className="mt-1 px-1 text-[12px] text-white/40">
                Cuenta para tu rango como ~{Math.round((1 / variant.factor) * 100)}% de esta
                marca en {exerciseById(lift).name.toLowerCase()} base.
              </p>
            )}
          </div>
        )}

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
        {entries.slice(0, 10).map((entry) => {
          const entryVariant = variantById(entry.lift, entry.variantId);
          return (
            <Glass key={entry.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="text-[15px] font-medium">
                  {entryVariant.name} · {entry.weightKg} kg × {entry.reps}
                </p>
                <p className="text-[12px] text-white/45">
                  {new Date(entry.date).toLocaleString("es", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {entryVariant.factor !== 1 && ` · equivale a ${formatKg(equivalent1rm(entry))}`}
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
          );
        })}
      </div>
    </div>
  );
}
