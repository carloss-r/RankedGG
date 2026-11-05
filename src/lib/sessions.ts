import type { LiftEntry, WorkoutSession } from "./types";

/** Una sesión sin actividad por más de 6 h se da por terminada. */
export const STALE_SESSION_MS = 6 * 60 * 60 * 1000;

export const LOOSE_SESSION_ID = "__loose__";

export type SessionGroup = {
  session: WorkoutSession;
  /** Series de la sesión, de la primera a la última. */
  entries: LiftEntry[];
  active: boolean;
};

function byDateAsc(a: LiftEntry, b: LiftEntry) {
  return a.date.localeCompare(b.date);
}

/** Último movimiento de la sesión (la serie más reciente, o su inicio). */
export function lastActivityMs(session: WorkoutSession, entries: LiftEntry[]): number {
  let last = Date.parse(session.startedAt);
  for (const entry of entries) {
    if (entry.sessionId !== session.id) continue;
    const time = Date.parse(entry.date);
    if (time > last) last = time;
  }
  return last;
}

export function isStale(lastActivity: number, now: number): boolean {
  return now - lastActivity > STALE_SESSION_MS;
}

/**
 * Agrupa las series por sesión, la más reciente primero. Las series cuya
 * sesión no existe se juntan en una sesión "suelta" al final.
 */
export function groupBySession(
  entries: LiftEntry[],
  sessions: WorkoutSession[],
): SessionGroup[] {
  const known = new Set(sessions.map((session) => session.id));
  const bySession = new Map<string, LiftEntry[]>();
  const loose: LiftEntry[] = [];

  for (const entry of entries) {
    if (entry.sessionId && known.has(entry.sessionId)) {
      const list = bySession.get(entry.sessionId);
      if (list) list.push(entry);
      else bySession.set(entry.sessionId, [entry]);
    } else {
      loose.push(entry);
    }
  }

  const groups: SessionGroup[] = sessions.map((session) => ({
    session,
    entries: (bySession.get(session.id) ?? []).slice().sort(byDateAsc),
    active: !session.endedAt,
  }));
  groups.sort((a, b) => b.session.startedAt.localeCompare(a.session.startedAt));

  if (loose.length > 0) {
    const sorted = loose.slice().sort(byDateAsc);
    groups.push({
      session: {
        id: LOOSE_SESSION_ID,
        accountId: sorted[0].accountId ?? "",
        startedAt: sorted[0].date,
        endedAt: sorted[sorted.length - 1].date,
        title: "Marcas sin sesión",
      },
      entries: sorted,
      active: false,
    });
  }

  return groups;
}

export function sessionDurationMs(group: SessionGroup, now: number): number {
  const start = Date.parse(group.session.startedAt);
  let end: number;
  if (group.session.endedAt) end = Date.parse(group.session.endedAt);
  else if (group.active) end = now;
  else end = start;
  return Math.max(0, end - start);
}
