import raw from "../data/exercises.json";
import type { ExerciseDef, LiftId, MuscleDef, MuscleId, RpgConfig, Sex, VariantDef } from "./types";

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
  muscles: Record<MuscleId, MuscleDef>;
  validation: { minReps: number; maxReps: number; maxPlausibleOfWorldClass: number };
  exercises: ExerciseDef[];
};

export const CATALOG = raw as unknown as Catalog;

export const CATALOG_VERSION = CATALOG.version;
export const EXERCISES: ExerciseDef[] = CATALOG.exercises;
export const LIFTS: LiftId[] = EXERCISES.map((exercise) => exercise.id);
export const LEVELS = CATALOG.levels;
export const RPG = CATALOG.rpg;
export const MUSCLES = CATALOG.muscles;
export const MUSCLE_IDS: MuscleId[] = Object.keys(MUSCLES);
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

export function isMuscleId(value: unknown): value is MuscleId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(MUSCLES, value);
}

export function variantsOf(lift: LiftId): VariantDef[] {
  return exerciseById(lift).variants;
}

export function baseVariant(lift: LiftId): VariantDef {
  return variantsOf(lift)[0];
}

export function isVariantId(lift: LiftId, variant: unknown): boolean {
  return typeof variant === "string" && variantsOf(lift).some((item) => item.id === variant);
}

/** Variante pedida o, si no existe / no se indica, la base. */
export function variantById(lift: LiftId, variant?: string): VariantDef {
  return variantsOf(lift).find((item) => item.id === variant) ?? baseVariant(lift);
}

export function exercisesOfMuscle(muscle: MuscleId): ExerciseDef[] {
  return EXERCISES.filter((exercise) => exercise.muscle === muscle);
}
