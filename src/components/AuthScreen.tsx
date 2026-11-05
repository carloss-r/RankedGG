"use client";

import { useState } from "react";
import type { AuthApi } from "../hooks/useAuth";
import type { Account } from "../lib/types";
import { Onboarding } from "./Onboarding";
import { ErrorNote, Field, Glass, PrimaryButton, TextInput } from "./ui";

/** Entrar a una cuenta existente (con o sin PIN) o crear una nueva. */
export function AuthScreen({ auth }: { auth: AuthApi }) {
  const { accounts } = auth;
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Account | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sin cuentas (primera vez, o se borró la última) solo se puede crear una.
  if (creating || accounts.length === 0) {
    return (
      <Onboarding
        takenNames={accounts.map((account) => account.nameKey)}
        onComplete={auth.register}
        onCancel={accounts.length > 0 ? () => setCreating(false) : undefined}
      />
    );
  }

  async function enter(account: Account, code?: string) {
    setBusy(true);
    setError(null);
    try {
      await auth.login(account.id, code);
      // Al iniciar sesión esta pantalla se desmonta.
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
      setPin("");
      setBusy(false);
    }
  }

  function pick(account: Account) {
    setError(null);
    setPin("");
    if (account.pin) setSelected(account);
    else void enter(account);
  }

  if (selected) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-[calc(var(--safe-top)+28px)]">
        <p className="text-[12px] tracking-[0.22em] text-white/45 uppercase">RankedGG</p>
        <div className="mt-8 flex flex-1 flex-col gap-6">
          <div>
            <p className="text-[13px] tracking-[0.18em] text-white/45 uppercase">Bienvenido</p>
            <h1 className="mt-1 text-[32px] font-semibold tracking-tight">{selected.name}</h1>
          </div>
          <Field label="PIN">
            <TextInput
              value={pin}
              onChange={(value) => setPin(value.replace(/\D/g, ""))}
              type="password"
              inputMode="numeric"
              placeholder="Tu PIN"
              maxLength={6}
              autoComplete="current-password"
              autoFocus
              onEnter={() => void enter(selected, pin)}
            />
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="mt-auto flex gap-3">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setPin("");
                setError(null);
              }}
              className="h-14 flex-1 rounded-full border border-white/15 text-white/80"
            >
              Atrás
            </button>
            <div className="flex-[1.4]">
              <PrimaryButton onClick={() => void enter(selected, pin)} disabled={busy || pin.length < 4}>
                {busy ? "Entrando…" : "Entrar"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-[calc(var(--safe-top)+28px)]">
      <p className="text-[12px] tracking-[0.22em] text-white/45 uppercase">RankedGG</p>
      <div className="mt-8 flex flex-1 flex-col gap-6">
        <h1 className="text-[32px] font-semibold tracking-tight">¿Quién entrena hoy?</h1>
        <div className="flex flex-col gap-3">
          {accounts.map((account) => (
            <Glass
              key={account.id}
              onClick={() => (busy ? undefined : pick(account))}
              className="flex w-full items-center gap-4 px-4 py-4"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-[20px] font-semibold">
                {account.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[18px] font-semibold">{account.name}</span>
                <span className="block text-[13px] text-white/50">
                  {account.pin ? "Protegida con PIN" : "Sin PIN"}
                </span>
              </span>
            </Glass>
          ))}
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="mt-auto">
          <PrimaryButton onClick={() => setCreating(true)}>Crear cuenta nueva</PrimaryButton>
        </div>
      </div>
    </div>
  );
}
