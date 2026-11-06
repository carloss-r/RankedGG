"use client";

import { useState } from "react";
import { PIN_PATTERN } from "../../lib/auth";
import { parseNumber } from "../../lib/format";
import type { Account, Profile, Sex } from "../../lib/types";
import { ErrorNote, Field, Glass, PrimaryButton, SuccessNote, TextInput } from "../ui";

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function ProfileScreen({
  account,
  profile,
  entriesCount,
  sessionsCount,
  onSave,
  onLogout,
  onChangePin,
  onDeleteAccount,
}: {
  account: Account;
  profile: Profile;
  entriesCount: number;
  sessionsCount: number;
  onSave: (input: { name: string; sex: Sex; bodyweightKg: number }) => Promise<void>;
  onLogout: () => Promise<void>;
  onChangePin: (currentPin: string, nextPin: string | null) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}) {
  const [name, setName] = useState(profile.name);
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [bw, setBw] = useState(String(profile.bodyweightKg));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [pinOpen, setPinOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinDone, setPinDone] = useState<string | null>(null);

  async function save() {
    const bodyweightKg = parseNumber(bw);
    if (!Number.isFinite(bodyweightKg) || bodyweightKg < 30 || bodyweightKg > 250) {
      setSaveError("Ingresa un peso corporal entre 30 y 250 kg.");
      return;
    }
    setSaveError(null);
    try {
      await onSave({ name, sex, bodyweightKg });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "No se pudieron guardar los cambios.");
    }
  }

  function resetPinForm() {
    setCurrentPin("");
    setNewPin("");
    setNewPin2("");
  }

  async function savePin() {
    setPinError(null);
    setPinDone(null);
    if (account.pin && !PIN_PATTERN.test(currentPin)) {
      setPinError("Escribe tu PIN actual.");
      return;
    }
    if (!PIN_PATTERN.test(newPin)) {
      setPinError("El PIN nuevo debe tener de 4 a 6 números.");
      return;
    }
    if (newPin !== newPin2) {
      setPinError("Los dos PIN nuevos no coinciden.");
      return;
    }
    setPinBusy(true);
    try {
      await onChangePin(currentPin, newPin);
      setPinDone("PIN guardado.");
      resetPinForm();
      setPinOpen(false);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "No se pudo guardar el PIN.");
    } finally {
      setPinBusy(false);
    }
  }

  async function removePin() {
    setPinError(null);
    setPinDone(null);
    if (!PIN_PATTERN.test(currentPin)) {
      setPinError("Escribe tu PIN actual para quitarlo.");
      return;
    }
    setPinBusy(true);
    try {
      await onChangePin(currentPin, null);
      setPinDone("Listo: tu cuenta ya no pide PIN.");
      resetPinForm();
      setPinOpen(false);
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "No se pudo quitar el PIN.");
    } finally {
      setPinBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] tracking-[0.18em] text-white/45 uppercase">Atleta</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Perfil</h1>
      </header>

      <Glass className="flex flex-col gap-4 px-4 py-5">
        <Field label="Nombre">
          <TextInput value={name} onChange={setName} maxLength={24} />
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
        {saveError && <ErrorNote>{saveError}</ErrorNote>}
        <PrimaryButton onClick={save}>{saved ? "Guardado" : "Guardar cambios"}</PrimaryButton>
      </Glass>

      <Glass className="flex flex-col gap-3 px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] tracking-[0.14em] text-white/45 uppercase">Sesión iniciada</p>
            <p className="mt-1 text-[18px] font-semibold">{account.name}</p>
          </div>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="h-11 shrink-0 rounded-full border border-white/20 px-5 text-[14px] text-white/85"
          >
            Cerrar sesión
          </button>
        </div>
        <p className="text-[13px] leading-5 text-white/55">
          Cierra sesión para que otra persona use su cuenta en este teléfono. Tus datos
          quedan guardados.
        </p>
      </Glass>

      <Glass className="flex flex-col gap-4 px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[16px] font-semibold">PIN de acceso</p>
            <p className="mt-1 text-[13px] text-white/55">
              {account.pin ? "Tu cuenta está protegida con PIN." : "Tu cuenta entra sin PIN."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPinOpen(!pinOpen);
              setPinError(null);
              setPinDone(null);
              resetPinForm();
            }}
            className="h-11 shrink-0 rounded-full bg-white/10 px-5 text-[14px] text-white"
          >
            {pinOpen ? "Cancelar" : account.pin ? "Cambiar" : "Crear"}
          </button>
        </div>
        {pinDone && <SuccessNote>{pinDone}</SuccessNote>}
        {pinOpen && (
          <div className="flex flex-col gap-4">
            {account.pin && (
              <Field label="PIN actual">
                <TextInput
                  value={currentPin}
                  onChange={(value) => setCurrentPin(digitsOnly(value))}
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="current-password"
                />
              </Field>
            )}
            <Field label="PIN nuevo">
              <TextInput
                value={newPin}
                onChange={(value) => setNewPin(digitsOnly(value))}
                type="password"
                inputMode="numeric"
                placeholder="4 a 6 números"
                maxLength={6}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Repite el PIN nuevo">
              <TextInput
                value={newPin2}
                onChange={(value) => setNewPin2(digitsOnly(value))}
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoComplete="new-password"
              />
            </Field>
            {pinError && <ErrorNote>{pinError}</ErrorNote>}
            <PrimaryButton onClick={savePin} disabled={pinBusy}>
              Guardar PIN
            </PrimaryButton>
            {account.pin && (
              <button
                type="button"
                onClick={() => void removePin()}
                disabled={pinBusy}
                className="h-12 text-[14px] text-white/60 disabled:opacity-40"
              >
                Quitar PIN
              </button>
            )}
          </div>
        )}
      </Glass>

      <Glass className="px-5 py-5">
        <p className="text-[15px] leading-6 text-white/70">
          {entriesCount} {entriesCount === 1 ? "serie guardada" : "series guardadas"} en{" "}
          {sessionsCount} {sessionsCount === 1 ? "sesión" : "sesiones"} de este teléfono.
          RankedGG usa IndexedDB local: los datos no salen del dispositivo ni se sincronizan
          con otros.
        </p>
      </Glass>

      <Glass className="flex flex-col gap-3 px-5 py-5">
        <div>
          <h2 className="text-[17px] font-semibold">Quejas y sugerencias</h2>
          <p className="mt-1 text-[14px] leading-6 text-white/60">
            ¿Algo no funciona o tienes una idea? Escríbenos por WhatsApp: 773 201 0315.
          </p>
        </div>
        <a
          href="https://wa.me/527732010315?text=Hola%2C%20te%20escribo%20desde%20RankedGG%3A%20"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 w-full items-center justify-center rounded-full bg-[#25d366] text-[15px] font-semibold text-black"
        >
          Escribir por WhatsApp
        </a>
      </Glass>

      <button
        type="button"
        onClick={async () => {
          if (
            window.confirm(
              `Se borrará la cuenta "${account.name}" y todo su progreso de este teléfono. No se puede deshacer.`,
            )
          ) {
            await onDeleteAccount();
          }
        }}
        className="h-12 text-[14px] text-rose-300"
      >
        Borrar esta cuenta
      </button>
    </div>
  );
}
