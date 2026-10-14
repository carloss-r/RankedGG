import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

/**
 * La configuración web de Firebase NO es secreta (viaja en cada bundle del navegador).
 * La seguridad real está en database.rules.json, no en ocultar estas llaves.
 * Se pueden sobrescribir con NEXT_PUBLIC_FIREBASE_* en .env.local / Vercel.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyBuI1BK3-65ya6xckHZPFhaZl_amDrGFm4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "rankedgg-d64be.firebaseapp.com",
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
    "https://rankedgg-d64be-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "rankedgg-d64be",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "rankedgg-d64be.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "941242194975",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:941242194975:web:b928a78f8736216f1a892a",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-85BSHT3DEJ",
};

let analyticsStarted = false;

/** Solo para el navegador: inicializa (una sola vez) la app y sus servicios. */
export function getFirebase(): { app: FirebaseApp; auth: Auth; db: Database } {
  if (typeof window === "undefined") {
    throw new Error("Firebase solo se puede usar en el navegador");
  }
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  if (!analyticsStarted) {
    analyticsStarted = true;
    isSupported()
      .then((ok) => {
        if (ok) getAnalytics(app);
      })
      .catch(() => {
        // Analytics es opcional: si el navegador lo bloquea, la app sigue igual.
      });
  }

  return { app, auth: getAuth(app), db: getDatabase(app) };
}
