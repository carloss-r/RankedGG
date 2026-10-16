"use client";

import { useState } from "react";
import { toGlobalError } from "../lib/global/errors";
import { errorMessage } from "../lib/global/messages";
import {
  FULL_NAME_MAX,
  nameErrorMessage,
  normalizeFullName,
  publicName,
  validateFullName,
} from "../lib/global/names";
import { Field, Glass, PrimaryButton, TextInput } from "./ui";

/** Hoja para registrarse en el ranking global pidiendo el nombre completo. */
export function JoinSheet({
  initialName,
  onSubmit,
  onClose,
}: {
  initialName: string;
  onSubmit: (fullName: string) => Promise<void>;
  onClose: () => void;
}) {
  // Solo se precarga el nombre del perfil si ya parece un nombre completo.
  const [name, setName] = useState(validateFullName(initialName) === null ? initialName : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const preview = validateFullName(name) === null ? publicName(name) : null;

  async function submit() {
    const problem = validateFullName(name);
    if (problem) {
      setError(nameErrorMessage(problem));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onSubmit(normalizeFullName(name));
      onClose();
    } catch (err) {
      setError(errorMessage(toGlobalError(err).code));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/65 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={busy ? undefined : onClose} />
      <Glass className="glass-strong relative w-full max-w-md rounded-b-none px-5 pt-6 pb-[calc(24px+var(--safe-bottom))]">
        <p className="text-[12px] tracking-[0.18em] text-white/45 uppercase">Ranking global</p>
        <h2 className="mt-1 text-[26px] font-semibold tracking-tight">Regístrate</h2>
        <p className="mt-2 text-[14px] leading-5 text-white/65">
          Escribe tu nombre completo. Se guarda en la base de datos para verificar tu registro y
          solo tú puedes verlo. En el ranking aparecerá como{" "}
          <span className="text-white">{preview ?? "Nombre A."}</span>.
        </p>

        <div className="mt-5">
          <Field label="Nombre completo">
            <TextInput
              value={name}
              onChange={(value) => {
                setName(value.slice(0, FULL_NAME_MAX));
                setError("");
              }}
              placeholder="Ej. Carlos Rangel Pérez"
            />
          </Field>
          {error && <p className="mt-2 px-1 text-[13px] text-rose-300">{error}</p>}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-14 flex-1 rounded-full border border-white/15 text-white/80 disabled:opacity-40"
          >
            Cancelar
          </button>
          <div className="flex-[1.5]">
            <PrimaryButton onClick={submit} disabled={busy}>
              {busy ? "Registrando…" : "Registrarme"}
            </PrimaryButton>
          </div>
        </div>
      </Glass>
    </div>
  );
}
