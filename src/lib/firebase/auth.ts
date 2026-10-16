import { signInAnonymously, type User } from "firebase/auth";
import { toGlobalError } from "../global/errors";
import { getFirebase } from "./app";

/** Devuelve el usuario anónimo actual, creándolo si hace falta. */
export async function ensureUser(): Promise<User> {
  try {
    const { auth } = getFirebase();
    await auth.authStateReady();
    if (auth.currentUser) return auth.currentUser;
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    throw toGlobalError(err);
  }
}
