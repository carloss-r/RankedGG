"use client";

import { useState } from "react";
import type { RegisterInput } from "../hooks/useAuth";
import { cleanName, normalizeName, PIN_PATTERN } from "../lib/auth";
import { parseNumber } from "../lib/format";
import { LIFT_META, LIFTS } from "../lib/standards";
import type { CoreLiftId, Sex } from "../lib/types";
import { ErrorNote, Field, Glass, PrimaryButton, TextInput } from "./ui";

type Props = {
  /** `nameKey` de las cuentas que ya existen en este dispositivo. */
  takenNames: string[];
  onComplete: (input: RegisterInput) => Promise<void>;
  /** Si ya hay cuentas, permite volver a elegir una. */
  onCancel?: () => void;
};

export function Onboarding({ takenNames, onComplete, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [bw, setBw] = useState("75");
  const [marks, setMarks] = useState<Record<CoreLiftId, string>>({
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
  const [error, setError] = useState<string | null>(null);

  function goBack(to: number) {
    setError(null);
    setStep(to);
  }

  function continueFromName() {
    const clean = cleanName(name) || "Atleta";
    if (takenNames.includes(normalizeName(clean))) {
      setError("Ya existe una cuenta con ese nombre. Elige otro.");
      return;
    }
    if (pin !== "" || pin2 !== "") {
      if (!PIN_PATTERN.test(pin)) {
        setError("El PIN debe tener de 4 a 6 números.");
        return;
      }
      if (pin !== pin2) {
        setError("Los dos PIN no coinciden.");
        return;
      }
    }
    setError(null);
    setStep(2);
  }

  function continueFromProfile() {
    const bodyweightKg = parseNumber(bw);
    if (!Number.isFinite(bodyweightKg) || bodyweightKg < 30 || bodyweightKg > 250) {
      setError("Ingresa un peso corporal entre 30 y 250 kg.");
      return;
    }
    setError(null);
    setStep(3);
  }

  async function finish() {
    const bodyweightKg = parseNumber(bw);
    setBusy(true);
    setError(null);
    try {
      const parsed = LIFTS.flatMap((lift) => {
        const weightKg = parseNumber(marks[lift]);
        if (!Number.isFinite(weightKg) || weightKg <= 0) return [];
        return [{ lift, weightKg }];
      });
      await onComplete({
        name: cleanName(name) || "Atleta",
        sex,
        bodyweightKg,
        pin: pin === "" ? null : pin,
        marks: parsed,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
      setBusy(false);
    }
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
          <div className="mt-auto flex flex-col gap-3">
            <PrimaryButton onClick={() => setStep(1)}>Crear mi cuenta</PrimaryButton>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="h-12 text-[15px] text-white/70"
              >
                Ya tengo cuenta
              </button>
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-8 flex flex-1 flex-col gap-6">
          <h1 className="text-[32px] font-semibold tracking-tight">¿Cómo te llamas?</h1>
          <Field label="Nombre">
            <TextInput value={name} onChange={setName} placeholder="Tu nombre" maxLength={24} />
          </Field>
          <Glass className="flex flex-col gap-4 px-4 py-4">
            <div>
              <p className="text-[15px] font-medium">Proteger con PIN (opcional)</p>
              <p className="mt-1 text-[13px] leading-5 text-white/55">
                Si compartes este teléfono, un PIN de 4 a 6 números evita que otros entren a
                tu cuenta. Déjalo vacío para entrar directo.
              </p>
            </div>
            <Field label="PIN">
              <TextInput
                value={pin}
                onChange={(value) => setPin(value.replace(/\D/g, ""))}
                type="password"
                inputMode="numeric"
                placeholder="4 a 6 números"
                maxLength={6}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Repite el PIN">
              <TextInput
                value={pin2}
                onChange={(value) => setPin2(value.replace(/\D/g, ""))}
                type="password"
                inputMode="numeric"
                placeholder="Otra vez"
                maxLength={6}
                autoComplete="new-password"
              />
            </Field>
          </Glass>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="mt-auto flex gap-3">
            <button
              type="button"
              onClick={() => goBack(0)}
              className="h-14 flex-1 rounded-full border border-white/15 text-white/80"
            >
              Atrás
            </button>
            <div className="flex-[1.4]">
              <PrimaryButton onClick={continueFromName}>Continuar</PrimaryButton>
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
            <TextInput value={bw} onChange={setBw} inputMode="decimal" placeholder="75" />
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="mt-auto flex gap-3">
            <button
              type="button"
              onClick={() => goBack(1)}
              className="h-14 flex-1 rounded-full border border-white/15 text-white/80"
            >
              Atrás
            </button>
            <div className="flex-[1.4]">
              <PrimaryButton onClick={continueFromProfile}>Continuar</PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-8 flex flex-1 flex-col gap-5">
          <h1 className="text-[32px] font-semibold tracking-tight">Tus marcas</h1>
          <p className="text-[15px] text-white/60">
            Opcional. Puedes dejar vacío y actualizar después. 1 repetición o lo más
            cercano. En dominadas, el peso extra que cargas (0 si es tu peso corporal).
            Después podrás registrar cualquier otro ejercicio.
          </p>
          <div className="grid gap-3">
            {LIFTS.map((lift) => (
              <Glass key={lift} className="flex items-center gap-3 px-4 py-3">
                <span className="w-28 text-[15px] font-medium">{LIFT_META[lift].short}</span>
                <input
                  value={marks[lift]}
                  inputMode="decimal"
                  placeholder="kg"
                  aria-label={`Marca de ${LIFT_META[lift].name} en kg`}
                  onChange={(event) =>
                    setMarks((prev) => ({ ...prev, [lift]: event.target.value }))
                  }
                  className="h-11 flex-1 rounded-xl bg-transparent text-right text-[18px] outline-none placeholder:text-white/25"
                />
              </Glass>
            ))}
          </div>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="mt-auto flex gap-3">
            <button
              type="button"
              onClick={() => goBack(2)}
              className="h-14 flex-1 rounded-full border border-white/15 text-white/80"
            >
              Atrás
            </button>
            <div className="flex-[1.4]">
              <PrimaryButton onClick={finish} disabled={busy}>
                {busy ? "Creando…" : "Ver mi rango"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
