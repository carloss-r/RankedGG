import raw from "../data/exercises.json";
import type { ExerciseDef, LiftId, RpgConfig, Sex } from "./types";

/**
 * Catálogo de ejercicios. La única fuente de verdad es src/data/exercises.json:
 * para agregar un ejercicio basta con añadir una entrada allí (id, variables RPG
 * y tablas de estándares por sexo). El resto de la app (UI, motor, ranking global)
 * se alimenta de este catálogo.
 */
type Catalog = {
  version: number;
  levels: {
    labels: string[];
    percentiles: number[];
    scoreLow: number[];
    scoreHigh: number[];
  };
  rpg: RpgConfig;
  validation: { minReps: number; maxReps: number; maxPlausibleOfWorldClass: number };
  exercises: ExerciseDef[];
};

export const CATALOG = raw as unknown as Catalog;

export const CATALOG_VERSION = CATALOG.version;
export const EXERCISES: ExerciseDef[] = CATALOG.exercises;
export const LIFTS: LiftId[] = EXERCISES.map((exercise) => exercise.id);
export const LEVELS = CATALOG.levels;
export const RPG = CATALOG.rpg;
export const VALIDATION = CATALOG.validation;

const BY_ID = new Map<LiftId, ExerciseDef>(EXERCISES.map((exercise) => [exercise.id, exercise]));

export function isLiftId(value: unknown): value is LiftId {
  return typeof value === "string" && BY_ID.has(value);
}

export function exerciseById(id: LiftId): ExerciseDef {
  const exercise = BY_ID.get(id);
  if (!exercise) throw new Error(`Ejercicio desconocido: ${id}`);
  return exercise;
}

export function standardsFor(id: LiftId, sex: Sex) {
  return exerciseById(id).standards[sex];
}
