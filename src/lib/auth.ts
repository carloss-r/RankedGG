import type { Account, PinRecord } from "./types";

export const PIN_PATTERN = /^\d{4,6}$/;
export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 30_000;
/** Una cuenta con PIN pide volver a entrar si pasan 30 días sin usarla. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const NAME_MAX = 24;

const PBKDF2_ITERATIONS = 150_000;

/** Quita espacios sobrantes y limita el largo. */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, NAME_MAX);
}

/** Clave de unicidad: sin acentos, sin mayúsculas. */
export function normalizeName(name: string): string {
  return cleanName(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function lockRemainingMs(account: Account, now = Date.now()): number {
  return Math.max(0, account.lockedUntil - now);
}

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function derive(pin: string, salt: BufferSource, iterations: number) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      "Este navegador no puede proteger la cuenta con PIN (requiere HTTPS). Entra por la dirección segura de la app.",
    );
  }
  const key = await subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

export async function createPinRecord(pin: string): Promise<PinRecord> {
  const salt = new Uint8Array(16);
  globalThis.crypto.getRandomValues(salt);
  const hash = await derive(pin, salt, PBKDF2_ITERATIONS);
  return { salt: toHex(salt), hash, iterations: PBKDF2_ITERATIONS };
}

export async function verifyPin(pin: string, record: PinRecord): Promise<boolean> {
  if (!PIN_PATTERN.test(pin)) return false;
  const hash = await derive(pin, fromHex(record.salt), record.iterations);
  if (hash.length !== record.hash.length) return false;
  // Comparación sin cortocircuito.
  let diff = 0;
  for (let i = 0; i < hash.length; i += 1) {
    diff |= hash.charCodeAt(i) ^ record.hash.charCodeAt(i);
  }
  return diff === 0;
}
