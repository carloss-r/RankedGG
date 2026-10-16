import { get, ref, remove, set } from "firebase/database";
import { GlobalError, toGlobalError } from "../global/errors";
import { normalizeFullName, publicName, validateFullName } from "../global/names";
import { getFirebase } from "./app";
import { ensureUser } from "./auth";

/*
 * Registro de usuarios en Realtime Database:
 *   users/{uid} -> { fullName, publicName, status: "active", createdAt, updatedAt }
 * Solo su dueño puede leerlo/escribirlo. Las reglas exigen que exista y esté "active"
 * para poder publicar en players/, lifts/, muscles/ y variants/ (verificación en la BD).
 */

export type Registration = {
  fullName: string;
  publicName: string;
  status: "active";
  createdAt: number;
  updatedAt: number;
};

/** Lee el registro del usuario actual; null si no está registrado en la base. */
export async function getRegistration(uid?: string): Promise<Registration | null> {
  try {
    const id = uid ?? (await ensureUser()).uid;
    const { db } = getFirebase();
    const snap = await get(ref(db, `users/${id}`));
    const value = snap.val() as Partial<Registration> | null;
    if (!value || value.status !== "active" || !value.fullName || !value.publicName) return null;
    return value as Registration;
  } catch (err) {
    throw toGlobalError(err);
  }
}

/** Registra (o actualiza) al usuario con su nombre completo. */
export async function registerUser(fullNameRaw: string): Promise<Registration> {
  const problem = validateFullName(fullNameRaw);
  if (problem) throw new GlobalError(problem);
  const fullName = normalizeFullName(fullNameRaw);

  const user = await ensureUser();
  try {
    const { db } = getFirebase();
    const existing = await getRegistration(user.uid);
    const now = Date.now();
    const registration: Registration = {
      fullName,
      publicName: publicName(fullName),
      status: "active",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await set(ref(db, `users/${user.uid}`), registration);

    // Verificación: se vuelve a leer desde la base para confirmar que quedó guardado.
    const saved = await getRegistration(user.uid);
    if (!saved || saved.fullName !== fullName) throw new GlobalError("register_failed");
    return saved;
  } catch (err) {
    throw toGlobalError(err);
  }
}

/** Borra el registro (usar después de retirar los datos públicos). */
export async function deleteRegistration() {
  try {
    const { auth, db } = getFirebase();
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) return;
    await remove(ref(db, `users/${user.uid}`));
  } catch (err) {
    throw toGlobalError(err);
  }
}
