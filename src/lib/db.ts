import type { LiftEntry, Profile } from "./types";

const DB_NAME = "rankedgg";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta");
      }
      if (!db.objectStoreNames.contains("lifts")) {
        const store = db.createObjectStore("lifts", { keyPath: "id" });
        store.createIndex("by-date", "date");
        store.createIndex("by-lift", "lift");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadProfile(): Promise<Profile | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction("meta").objectStore("meta").get("profile");
    request.onsuccess = () => resolve((request.result as Profile | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProfile(profile: Profile) {
  const db = await openDb();
  const tx = db.transaction("meta", "readwrite");
  tx.objectStore("meta").put(profile, "profile");
  await txDone(tx);
}

export async function loadLifts(): Promise<LiftEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction("lifts").objectStore("lifts").getAll();
    request.onsuccess = () => {
      const rows = (request.result as LiftEntry[]) ?? [];
      rows.sort((a, b) => b.date.localeCompare(a.date));
      resolve(rows);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function addLift(entry: LiftEntry) {
  const db = await openDb();
  const tx = db.transaction("lifts", "readwrite");
  tx.objectStore("lifts").put(entry);
  await txDone(tx);
}

export async function deleteLift(id: string) {
  const db = await openDb();
  const tx = db.transaction("lifts", "readwrite");
  tx.objectStore("lifts").delete(id);
  await txDone(tx);
}

export async function clearAll() {
  const db = await openDb();
  const tx = db.transaction(["meta", "lifts"], "readwrite");
  tx.objectStore("meta").clear();
  tx.objectStore("lifts").clear();
  await txDone(tx);
}
