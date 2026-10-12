"use client";

import { useState } from "react";
import type { LiftId, Sex } from "../lib/types";
import { LIFT_META, LIFTS } from "../lib/standards";
import { Field, Glass, PrimaryButton, TextInput } from "./ui";

type Props = {
  onComplete: (input: {
    name: string;
    sex: Sex;
    bodyweightKg: number;
    marks: { lift: LiftId; weightKg: number }[];
  }) => Promise<void>;
};

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [bw, setBw] = useState("75");
  const [marks, setMarks] = useState<Record<LiftId, string>>({
    squat: "",
    bench: "",
    deadlift: "",
    ohp: "",
    row: "",
    pullup: "",
    curl: "",
    tricep: "",
  });
  const [busy, setBusy] = useState(false);

  async function finish() {
    const bodyweightKg = Number(bw.replace(",", "."));
    if (!Number.isFinite(bodyweightKg) || bodyweightKg < 30 || bodyweightKg > 250) return;
    setBusy(true);
    const parsed = LIFTS.flatMap((lift) => {
      const weightKg = Number(marks[lift].replace(",", "."));
      if (!Number.isFinite(weightKg) || weightKg <= 0) return [];
      return [{ lift, weightKg }];
    });
    await onComplete({
      name: name.trim() || "Atleta",
      sex,
      bodyweightKg,
      marks: parsed,
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-[calc(var(--safe-top)+28px)]">
      <p className="text-[12px] tracking-[0.22em] text-white/45 uppercase">RankedGG</p>
      {step === 0 && (
        <div className="mt-8 flex flex-1 flex-col">
          <h1 className="text-[40px] leading-[1.05] font-semibold tracking-tight">
            Tu fuerza,
            <br />
            en un rango.
          </h1>
          <p className="mt-4 max-w-[34ch] text-[17px] leading-7 text-white/65">
            Mira tu progreso de gimnasio como un RPG: de Madera a Mr Olympia, comparado
            con estándares mundiales de peso.
          </p>
          <div className="mt-auto">
            <PrimaryButton onClick={() => setStep(1)}>Empezar</PrimaryButton>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-8 flex flex-1 flex-col gap-6">
          <h1 className="text-[32px] font-semibold tracking-tight">¿Cómo te llamas?</h1>
          <Field label="Nombre">
            <TextInput value={name} onChange={setName} placeholder="Tu nombre" />
          </Field>
          <div className="mt-auto flex gap-3">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="h-14 flex-1 rounded-full border border-white/15 text-white/80"
            >
              Atrás
            </button>
            <div className="flex-[1.4]">
              <PrimaryButton onClick={() => setStep(2)}>Continuar</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-8 flex flex-1 flex-col gap-6">
          <h1 className="text-[32px] font-semibold tracking-tight">Tu perfil</h1>
          <p className="text-[15px] text-white/60">
            El rango se calcula contra datos globales de tu mismo peso y sexo.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["male", "Hombre"],
                ["female", "Mujer"],
              ] as const
            ).map(([value, label]) => (
              <Glass
                key={value}
                onClick={() => setSex(value)}
                className={`h-16 px-4 text-[16px] font-medium ${
                  sex === value ? "ring-2 ring-white/70" : ""
                }`}
              >
                {label}
              </Glass>
            ))}
          </div>
          <Field label="Peso corporal (kg)">
            <TextInput
              value={bw}
              onChange={setBw}
              inputMode="decimal"
              placeholder="75"
            />
          </Field>
          <div className="mt-auto flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-14 flex-1 rounded-full border border-white/15 text-white/80"
            >
              Atrás
            </button>
            <div className="flex-[1.4]">
              <PrimaryButton onClick={() => setStep(3)}>Continuar</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-8 flex flex-1 flex-col gap-5">
          <h1 className="text-[32px] font-semibold tracking-tight">Tus marcas</h1>
          <p className="text-[15px] text-white/60">
            Opcional. Puedes dejar vacío y actualizar después. 1 repetición o lo más
            cercano.
          </p>
          <div className="grid gap-3">
            {LIFTS.map((lift) => (
              <Glass key={lift} className="flex items-center gap-3 px-4 py-3">
                <span className="w-28 text-[15px] font-medium">{LIFT_META[lift].short}</span>
                <input
                  value={marks[lift]}
                  inputMode="decimal"
                  placeholder="kg"
                  onChange={(event) =>
                    setMarks((prev) => ({ ...prev, [lift]: event.target.value }))
                  }
                  className="h-11 flex-1 rounded-xl bg-transparent text-right text-[18px] outline-none placeholder:text-white/25"
                />
              </Glass>
            ))}
          </div>
          <div className="mt-auto flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="h-14 flex-1 rounded-full border border-white/15 text-white/80"
            >
              Atrás
            </button>
            <div className="flex-[1.4]">
              <PrimaryButton onClick={finish} disabled={busy}>
                Ver mi rango
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
