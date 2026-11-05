import { normalizeName } from "./auth";
import { newId } from "./id";
import type {
  Account,
  AuthSession,
  Exercise,
  LiftEntry,
  LiftId,
  Profile,
  WorkoutSession,
} from "./types";

const DB_NAME = "rankedgg";
const DB_VERSION = 2;

type CustomExerciseRow = Exercise & { accountId: string };

let dbPromise: Promise<IDBDatabase> | null = null;

function profileKey(accountId: string) {
  return `profile:${accountId}`;
}

/** Crea/actualiza los stores. Si venía de la v1 (sin cuentas) migra los datos. */
function migrate(request: IDBOpenDBRequest, oldVersion: number) {
  const db = request.result;
  const tx = request.transaction;
  if (!tx) return;

  if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");

  const lifts = db.objectStoreNames.contains("lifts")
    ? tx.objectStore("lifts")
    : db.createObjectStore("lifts", { keyPath: "id" });
  if (!lifts.indexNames.contains("by-date")) lifts.createIndex("by-date", "date");
  if (!lifts.indexNames.contains("by-lift")) lifts.createIndex("by-lift", "lift");
  if (!lifts.indexNames.contains("by-account")) lifts.createIndex("by-account", "accountId");

  if (!db.objectStoreNames.contains("accounts")) {
    const accounts = db.createObjectStore("accounts", { keyPath: "id" });
    accounts.createIndex("by-name", "nameKey", { unique: true });
  }
  if (!db.objectStoreNames.contains("sessions")) {
    const sessions = db.createObjectStore("sessions", { keyPath: "id" });
    sessions.createIndex("by-account", "accountId");
  }
  if (!db.objectStoreNames.contains("exercises")) {
    const exercises = db.createObjectStore("exercises", { keyPath: "id" });
    exercises.createIndex("by-account", "accountId");
  }

  if (oldVersion >= 1 && oldVersion < 2) migrateLegacy(tx);
}

/**
 * La v1 guardaba un único perfil y marcas sin dueño. Se convierte en una
 * cuenta sin PIN con sesión abierta y las marcas se agrupan por día en
 * sesiones de entrenamiento, para que no se pierda nada.
 */
function migrateLegacy(tx: IDBTransaction) {
  const meta = tx.objectStore("meta");
  const profileRequest = meta.get("profile");

  profileRequest.onsuccess = () => {
    const legacy = profileRequest.result as Profile | undefined;
    if (!legacy) return;

    const now = new Date().toISOString();
    const name = legacy.name?.trim() || "Atleta";
    const accountId = newId();
    const account: Account = {
      id: accountId,
      name,
      nameKey: normalizeName(name),
      pin: null,
      failedAttempts: 0,
      lockedUntil: 0,
      createdAt: legacy.createdAt ?? now,
      lastLoginAt: now,
    };
    tx.objectStore("accounts").put(account);
    meta.put({ ...legacy, name }, profileKey(accountId));
    meta.delete("profile");
    meta.put({ accountId, startedAt: now, lastActiveAt: now } satisfies AuthSession, "session");

    const liftsStore = tx.objectStore("lifts");
    const sessionsStore = tx.objectStore("sessions");
    const allRequest = liftsStore.getAll();
    allRequest.onsuccess = () => {
      const rows = (allRequest.result as LiftEntry[]) ?? [];
      const byDay = new Map<string, LiftEntry[]>();
      for (const row of rows) {
        const key = row.date.slice(0, 10);
        const list = byDay.get(key);
        if (list) list.push(row);
        else byDay.set(key, [row]);
      }
      byDay.forEach((dayRows) => {
        dayRows.sort((a, b) => a.date.localeCompare(b.date));
        const session: WorkoutSession = {
          id: newId(),
          accountId,
          startedAt: dayRows[0].date,
          endedAt: dayRows[dayRows.length - 1].date,
        };
        sessionsStore.put(session);
        for (const row of dayRows) {
          liftsStore.put({ ...row, accountId, sessionId: session.id });
        }
      });
    };
  };
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      dbPromise = null;
      reject(new Error("Este navegador no permite guardar datos locales."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => migrate(request, event.oldVersion);
    request.onsuccess = () => {
      const db = request.result;
      // Si otra pestaña actualiza la base, soltamos la conexión para no bloquearla.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("No se pudo abrir la base de datos local."));
    };
    request.onblocked = () => {
      dbPromise = null;
      reject(
        new Error("Hay otra pestaña de RankedGG abierta. Ciérrala y vuelve a cargar esta página."),
      );
    };
  });

  return dbPromise;
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Error al guardar en la base de datos local."));
    tx.onabort = () => reject(tx.error ?? new Error("La operación fue cancelada."));
  });
}

const DUPLICATE_NAME = "Ya existe una cuenta con ese nombre.";

/* ------------------------------- Cuentas ------------------------------- */

export async function listAccounts(): Promise<Account[]> {
  const db = await openDb();
  const rows = (await req(db.transaction("accounts").objectStore("accounts").getAll())) as Account[];
  rows.sort((a, b) => b.lastLoginAt.localeCompare(a.lastLoginAt));
  return rows;
}

export async function getAccount(id: string): Promise<Account | null> {
  const db = await openDb();
  const row = await req(db.transaction("accounts").objectStore("accounts").get(id));
  return (row as Account | undefined) ?? null;
}

export async function putAccount(account: Account): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("accounts", "readwrite");
  const request = tx.objectStore("accounts").put(account);
  let duplicate = false;
  request.onerror = () => {
    if (request.error?.name === "ConstraintError") duplicate = true;
  };
  try {
    await txDone(tx);
  } catch (err) {
    if (duplicate) throw new Error(DUPLICATE_NAME);
    throw err;
  }
}

/**
 * Crea cuenta + perfil + marcas iniciales + sesión abierta en una sola
 * transacción: o se guarda todo o no se guarda nada.
 */
export async function createAccount(
  account: Account,
  profile: Profile,
  marks: { lift: LiftId; weightKg: number }[],
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(["accounts", "meta", "lifts", "sessions"], "readwrite");
  const done = txDone(tx);

  let duplicate = false;
  const addRequest = tx.objectStore("accounts").add(account);
  addRequest.onerror = () => {
    if (addRequest.error?.name === "ConstraintError") duplicate = true;
  };

  tx.objectStore("meta").put(profile, profileKey(account.id));
  tx.objectStore("meta").put(
    {
      accountId: account.id,
      startedAt: account.lastLoginAt,
      lastActiveAt: account.lastLoginAt,
    } satisfies AuthSession,
    "session",
  );

  if (marks.length > 0) {
    const base = Date.parse(account.createdAt);
    const session: WorkoutSession = {
      id: newId(),
      accountId: account.id,
      startedAt: new Date(base).toISOString(),
      endedAt: new Date(base + marks.length).toISOString(),
      title: "Marcas iniciales",
    };
    tx.objectStore("sessions").put(session);
    marks.forEach((mark, index) => {
      const entry: LiftEntry = {
        id: newId(),
        accountId: account.id,
        sessionId: session.id,
        lift: mark.lift,
        weightKg: mark.weightKg,
        reps: 1,
        estimated1rm: mark.weightKg,
        // Un milisegundo de diferencia para conservar el orden de captura.
        date: new Date(base + index).toISOString(),
      };
      tx.objectStore("lifts").put(entry);
    });
  }

  try {
    await done;
  } catch (err) {
    if (duplicate) throw new Error(DUPLICATE_NAME);
    throw err;
  }
}

function deleteByAccount(tx: IDBTransaction, storeName: string, accountId: string) {
  const store = tx.objectStore(storeName);
  const keysRequest = store.index("by-account").getAllKeys(accountId);
  keysRequest.onsuccess = () => {
    for (const key of keysRequest.result) store.delete(key);
  };
}

/** Borra la cuenta y todo lo suyo. No toca a las demás cuentas. */
export async function deleteAccountData(accountId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(["accounts", "meta", "lifts", "sessions", "exercises"], "readwrite");
  const done = txDone(tx);

  tx.objectStore("accounts").delete(accountId);
  const meta = tx.objectStore("meta");
  meta.delete(profileKey(accountId));
  const sessionRequest = meta.get("session");
  sessionRequest.onsuccess = () => {
    const current = sessionRequest.result as AuthSession | undefined;
    if (current?.accountId === accountId) meta.delete("session");
  };
  deleteByAccount(tx, "lifts", accountId);
  deleteByAccount(tx, "sessions", accountId);
  deleteByAccount(tx, "exercises", accountId);

  await done;
}

/* -------------------------- Sesión de inicio de sesión -------------------------- */

export async function loadSession(): Promise<AuthSession | null> {
  const db = await openDb();
  const row = await req(db.transaction("meta").objectStore("meta").get("session"));
  return (row as AuthSession | undefined) ?? null;
}

export async function saveSession(session: AuthSession): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("meta", "readwrite");
  tx.objectStore("meta").put(session, "session");
  await txDone(tx);
}

export async function clearSession(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("meta", "readwrite");
  tx.objectStore("meta").delete("session");
  await txDone(tx);
}

/** Renueva `lastActiveAt` sin pisar una sesión que ya sea de otra cuenta. */
export async function touchSession(accountId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("meta", "readwrite");
  const store = tx.objectStore("meta");
  const request = store.get("session");
  request.onsuccess = () => {
    const current = request.result as AuthSession | undefined;
    if (current && current.accountId === accountId) {
      store.put({ ...current, lastActiveAt: new Date().toISOString() }, "session");
    }
  };
  await txDone(tx);
}

/* --------------------------------- Perfil --------------------------------- */

export async function loadProfile(accountId: string): Promise<Profile | null> {
  const db = await openDb();
  const row = await req(db.transaction("meta").objectStore("meta").get(profileKey(accountId)));
  return (row as Profile | undefined) ?? null;
}

export async function saveProfile(accountId: string, profile: Profile): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("meta", "readwrite");
  tx.objectStore("meta").put(profile, profileKey(accountId));
  await txDone(tx);
}

/* --------------------------------- Marcas --------------------------------- */

export async function loadLifts(accountId: string): Promise<LiftEntry[]> {
  const db = await openDb();
  const index = db.transaction("lifts").objectStore("lifts").index("by-account");
  const rows = ((await req(index.getAll(accountId))) as LiftEntry[]) ?? [];
  rows.sort((a, b) => b.date.localeCompare(a.date));
  return rows;
}

export async function addLift(entry: LiftEntry): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("lifts", "readwrite");
  tx.objectStore("lifts").put(entry);
  await txDone(tx);
}

export async function deleteLift(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("lifts", "readwrite");
  tx.objectStore("lifts").delete(id);
  await txDone(tx);
}

/* ------------------------- Sesiones de entrenamiento ------------------------- */

export async function loadSessions(accountId: string): Promise<WorkoutSession[]> {
  const db = await openDb();
  const index = db.transaction("sessions").objectStore("sessions").index("by-account");
  const rows = ((await req(index.getAll(accountId))) as WorkoutSession[]) ?? [];
  rows.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return rows;
}

export async function saveWorkoutSession(session: WorkoutSession): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("sessions", "readwrite");
  tx.objectStore("sessions").put(session);
  await txDone(tx);
}

/* --------------------------- Ejercicios personalizados --------------------------- */

export async function loadCustomExercises(accountId: string): Promise<Exercise[]> {
  const db = await openDb();
  const index = db.transaction("exercises").objectStore("exercises").index("by-account");
  const rows = ((await req(index.getAll(accountId))) as CustomExerciseRow[]) ?? [];
  return rows.map((row) => {
    const exercise: Partial<CustomExerciseRow> = { ...row };
    delete exercise.accountId;
    return exercise as Exercise;
  });
}

export async function saveCustomExercise(accountId: string, exercise: Exercise): Promise<void> {
  const db = await openDb();
  const tx = db.transaction("exercises", "readwrite");
  const row: CustomExerciseRow = { ...exercise, accountId };
  tx.objectStore("exercises").put(row);
  await txDone(tx);
}
