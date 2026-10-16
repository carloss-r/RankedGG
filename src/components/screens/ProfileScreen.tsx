"use client";

import { useState } from "react";
import type { GlobalSync } from "../../hooks/useGym";
import type { Profile, Sex } from "../../lib/types";
import { Field, Glass, PrimaryButton, TextInput } from "../ui";
import { errorMessage } from "../../lib/global/messages";

export function ProfileScreen({
  profile,
  entriesCount,
  shareGlobally,
  sync,
  onToggleGlobal,
  onSave,
  onReset,
}: {
  profile: Profile;
  entriesCount: number;
  shareGlobally: boolean;
  sync: GlobalSync;
  onToggleGlobal: (on: boolean) => Promise<void>;
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

      <Glass className="flex flex-col gap-3 px-5 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[16px] font-semibold">Ranking global</p>
            <p className="mt-1 text-[13px] leading-5 text-white/60">
              Comparte nombre, rango y mejores marcas. Tu peso corporal no se muestra.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={shareGlobally}
            onClick={() => onToggleGlobal(!shareGlobally)}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
              shareGlobally ? "bg-emerald-400" : "bg-white/15"
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
                shareGlobally ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>
        {shareGlobally && (
          <p className="text-[13px] text-white/55">
            {sync.status === "syncing" && "Sincronizando…"}
            {sync.status === "ok" && sync.me && `Posición global #${sync.me.position}`}
            {sync.status === "error" && errorMessage(sync.error)}
            {sync.status === "idle" && "Se sincroniza al guardar una marca."}
          </p>
        )}
      </Glass>

      <Glass className="px-5 py-5">
        <p className="text-[15px] leading-6 text-white/70">
          {entriesCount} marcas guardadas en este teléfono. Tu historial vive en IndexedDB;
          al unirte al ranking solo se envían tu perfil y tus mejores marcas.
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
