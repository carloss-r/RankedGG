"use client";

import { useState } from "react";
import type { Profile, Sex } from "../../lib/types";
import { Field, Glass, PrimaryButton, TextInput } from "../ui";

export function ProfileScreen({
  profile,
  entriesCount,
  onSave,
  onReset,
}: {
  profile: Profile;
  entriesCount: number;
  onSave: (input: { name: string; sex: Sex; bodyweightKg: number }) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const [name, setName] = useState(profile.name);
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [bw, setBw] = useState(String(profile.bodyweightKg));
  const [saved, setSaved] = useState(false);

  async function save() {
    const bodyweightKg = Number(bw.replace(",", "."));
    if (!Number.isFinite(bodyweightKg) || bodyweightKg < 30) return;
    await onSave({ name, sex, bodyweightKg });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] tracking-[0.18em] text-white/45 uppercase">Atleta</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Perfil</h1>
      </header>

      <Glass className="flex flex-col gap-4 px-4 py-5">
        <Field label="Nombre">
          <TextInput value={name} onChange={setName} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["male", "Hombre"],
              ["female", "Mujer"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSex(value)}
              className={`h-12 rounded-2xl text-[15px] ${
                sex === value ? "bg-white text-black" : "bg-white/8 text-white/80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Field label="Peso corporal (kg)">
          <TextInput value={bw} onChange={setBw} inputMode="decimal" />
        </Field>
        <PrimaryButton onClick={save}>{saved ? "Guardado" : "Guardar cambios"}</PrimaryButton>
      </Glass>

      <Glass className="px-5 py-5">
        <p className="text-[15px] leading-6 text-white/70">
          {entriesCount} marcas guardadas en este teléfono. RankedGG usa IndexedDB local:
          los datos no salen del dispositivo.
        </p>
      </Glass>

      <button
        type="button"
        onClick={async () => {
          if (confirm("Se borrará todo el progreso de este teléfono.")) await onReset();
        }}
        className="h-12 text-[14px] text-rose-300"
      >
        Borrar datos locales
      </button>
    </div>
  );
}
