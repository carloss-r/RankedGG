import type { Exercise, LiftEntry } from "./types";

export function formatClock(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} h ${String(rest).padStart(2, "0")} min`;
}

export function formatSeconds(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes}:${String(seconds).padStart(2, "0")} min`;
}

function kg(value: number): string {
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} kg`;
}

/** Texto corto de una serie según el tipo de ejercicio. */
export function formatSet(entry: LiftEntry, exercise?: Exercise): string {
  const kind = exercise?.kind ?? "weight";
  if (kind === "timed") return formatSeconds(entry.reps);
  if (kind === "bodyweight") {
    return entry.weightKg > 0 ? `+${kg(entry.weightKg)} × ${entry.reps}` : `${entry.reps} reps`;
  }
  return `${kg(entry.weightKg)} × ${entry.reps}`;
}

export function parseNumber(text: string): number {
  return Number(text.trim().replace(",", "."));
}
