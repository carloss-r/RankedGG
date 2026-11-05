"use client";

import { useCallback, useEffect, useState } from "react";
import {
  cleanName,
  createPinRecord,
  LOCK_MS,
  lockRemainingMs,
  MAX_ATTEMPTS,
  normalizeName,
  PIN_PATTERN,
  SESSION_TTL_MS,
  verifyPin,
} from "../lib/auth";
import {
  clearSession,
  createAccount,
  deleteAccountData,
  getAccount,
  listAccounts,
  loadSession,
  putAccount,
  saveSession,
  touchSession,
} from "../lib/db";
import { newId } from "../lib/id";
import type { Account, LiftId, Profile, Sex } from "../lib/types";

export type RegisterInput = {
  name: string;
  sex: Sex;
  bodyweightKg: number;
  /** PIN de 4 a 6 números, o null para una cuenta sin PIN. */
  pin: string | null;
  marks: { lift: LiftId; weightKg: number }[];
};

function messageOf(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function useAuth() {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const list = await listAccounts();
    setAccounts(list);
    return list;
  }, []);

  // Al abrir la app: recuperar la sesión guardada, si sigue vigente.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listAccounts();
        const session = await loadSession();
        let current: Account | null = null;

        if (session) {
          const found = list.find((item) => item.id === session.accountId) ?? null;
          const idleMs = Date.now() - Date.parse(session.lastActiveAt);
          const expired = Boolean(found?.pin) && idleMs > SESSION_TTL_MS;
          if (found && !expired) {
            current = found;
            await touchSession(found.id);
          } else {
            await clearSession();
          }
        }

        if (cancelled) return;
        setAccounts(list);
        setAccount(current);
      } catch (err) {
        if (!cancelled) setError(messageOf(err, "No se pudo abrir el almacenamiento local."));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mantener viva la sesión: se renueva al salir de la app o cambiar de pestaña.
  useEffect(() => {
    if (!account) return;
    const accountId = account.id;
    function onHide() {
      if (document.visibilityState === "hidden") {
        touchSession(accountId).catch(() => undefined);
      }
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [account]);

  const login = useCallback(
    async (accountId: string, pin?: string) => {
      const fresh = await getAccount(accountId);
      if (!fresh) {
        await reload();
        throw new Error("Esa cuenta ya no existe.");
      }

      const now = Date.now();
      if (fresh.pin) {
        const wait = lockRemainingMs(fresh, now);
        if (wait > 0) {
          throw new Error(`Demasiados intentos. Espera ${Math.ceil(wait / 1000)} s e inténtalo de nuevo.`);
        }
        const valid = pin ? await verifyPin(pin, fresh.pin) : false;
        if (!valid) {
          const failed = fresh.failedAttempts + 1;
          const lock = failed >= MAX_ATTEMPTS;
          await putAccount({
            ...fresh,
            failedAttempts: lock ? 0 : failed,
            lockedUntil: lock ? now + LOCK_MS : 0,
          });
          await reload();
          throw new Error(
            lock
              ? `Demasiados intentos. Espera ${LOCK_MS / 1000} s e inténtalo de nuevo.`
              : `PIN incorrecto. Te quedan ${MAX_ATTEMPTS - failed} intentos.`,
          );
        }
      }

      const iso = new Date(now).toISOString();
      const next: Account = { ...fresh, failedAttempts: 0, lockedUntil: 0, lastLoginAt: iso };
      await putAccount(next);
      await saveSession({ accountId: next.id, startedAt: iso, lastActiveAt: iso });
      setAccount(next);
      await reload();
    },
    [reload],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const name = cleanName(input.name) || "Atleta";
      if (!Number.isFinite(input.bodyweightKg) || input.bodyweightKg < 30 || input.bodyweightKg > 250) {
        throw new Error("Ingresa un peso corporal entre 30 y 250 kg.");
      }
      if (input.pin !== null && !PIN_PATTERN.test(input.pin)) {
        throw new Error("El PIN debe tener de 4 a 6 números.");
      }

      const iso = new Date().toISOString();
      const next: Account = {
        id: newId(),
        name,
        nameKey: normalizeName(name),
        pin: input.pin === null ? null : await createPinRecord(input.pin),
        failedAttempts: 0,
        lockedUntil: 0,
        createdAt: iso,
        lastLoginAt: iso,
      };
      const profile: Profile = {
        name,
        sex: input.sex,
        bodyweightKg: input.bodyweightKg,
        createdAt: iso,
        updatedAt: iso,
      };

      // Cuenta, perfil, marcas iniciales y sesión se guardan juntos o no se guarda nada.
      await createAccount(next, profile, input.marks);
      setAccount(next);
      await reload();
    },
    [reload],
  );

  const logout = useCallback(async () => {
    await clearSession();
    setAccount(null);
    await reload();
  }, [reload]);

  const removeAccount = useCallback(
    async (accountId: string) => {
      await deleteAccountData(accountId);
      setAccount((current) => (current?.id === accountId ? null : current));
      await reload();
    },
    [reload],
  );

  const renameAccount = useCallback(
    async (name: string) => {
      if (!account) return;
      const clean = cleanName(name) || "Atleta";
      if (clean === account.name) return;
      const next: Account = { ...account, name: clean, nameKey: normalizeName(clean) };
      await putAccount(next);
      setAccount(next);
      await reload();
    },
    [account, reload],
  );

  /**
   * Crea, cambia o quita el PIN. Si la cuenta ya tiene PIN hay que dar el
   * actual. `nextPin = null` lo quita.
   */
  const changePin = useCallback(
    async (currentPin: string, nextPin: string | null) => {
      if (!account) return;
      if (account.pin) {
        const valid = await verifyPin(currentPin, account.pin);
        if (!valid) throw new Error("El PIN actual no es correcto.");
      }
      if (nextPin !== null && !PIN_PATTERN.test(nextPin)) {
        throw new Error("El PIN debe tener de 4 a 6 números.");
      }
      const next: Account = {
        ...account,
        pin: nextPin === null ? null : await createPinRecord(nextPin),
        failedAttempts: 0,
        lockedUntil: 0,
      };
      await putAccount(next);
      setAccount(next);
      await reload();
    },
    [account, reload],
  );

  return {
    ready,
    error,
    accounts,
    account,
    login,
    register,
    logout,
    removeAccount,
    renameAccount,
    changePin,
  };
}

export type AuthApi = ReturnType<typeof useAuth>;
