import type { LiftId, Sex } from "./types";

/** 1RM estimado (kg) por peso corporal. Niveles: untrained → world class. */
type BwRow = { bw: number; levels: number[] };

const MALE: Record<LiftId, BwRow[]> = {
  squat: [
    { bw: 52, levels: [22, 38, 58, 85, 118, 152, 185] },
    { bw: 60, levels: [28, 48, 74, 108, 148, 190, 228] },
    { bw: 67, levels: [34, 58, 88, 126, 170, 218, 260] },
    { bw: 75, levels: [40, 68, 102, 146, 196, 248, 295] },
    { bw: 82, levels: [46, 78, 116, 164, 218, 275, 325] },
    { bw: 90, levels: [52, 88, 130, 182, 242, 302, 355] },
    { bw: 100, levels: [58, 98, 146, 202, 266, 332, 390] },
    { bw: 110, levels: [64, 108, 160, 220, 288, 358, 418] },
    { bw: 125, levels: [70, 120, 176, 242, 316, 390, 452] },
  ],
  bench: [
    { bw: 52, levels: [16, 28, 42, 62, 85, 110, 132] },
    { bw: 60, levels: [20, 36, 54, 78, 108, 138, 165] },
    { bw: 67, levels: [24, 42, 64, 92, 125, 160, 190] },
    { bw: 75, levels: [28, 50, 76, 108, 145, 185, 218] },
    { bw: 82, levels: [32, 58, 86, 122, 162, 205, 242] },
    { bw: 90, levels: [36, 64, 96, 136, 180, 226, 266] },
    { bw: 100, levels: [40, 72, 108, 152, 198, 248, 292] },
    { bw: 110, levels: [44, 80, 118, 166, 216, 268, 314] },
    { bw: 125, levels: [48, 88, 130, 182, 236, 292, 340] },
  ],
  deadlift: [
    { bw: 52, levels: [30, 50, 78, 112, 150, 192, 230] },
    { bw: 60, levels: [38, 64, 98, 140, 186, 235, 278] },
    { bw: 67, levels: [46, 76, 116, 164, 216, 270, 318] },
    { bw: 75, levels: [54, 90, 136, 190, 248, 308, 362] },
    { bw: 82, levels: [62, 102, 154, 214, 276, 342, 400] },
    { bw: 90, levels: [70, 114, 172, 238, 304, 375, 438] },
    { bw: 100, levels: [78, 128, 192, 264, 336, 412, 478] },
    { bw: 110, levels: [84, 140, 210, 286, 362, 442, 512] },
    { bw: 125, levels: [92, 154, 230, 312, 394, 478, 552] },
  ],
  ohp: [
    { bw: 52, levels: [10, 18, 26, 38, 52, 66, 80] },
    { bw: 60, levels: [12, 22, 32, 48, 64, 82, 98] },
    { bw: 67, levels: [14, 26, 38, 56, 74, 94, 112] },
    { bw: 75, levels: [16, 30, 46, 64, 86, 108, 128] },
    { bw: 82, levels: [18, 34, 52, 72, 96, 120, 142] },
    { bw: 90, levels: [20, 38, 58, 80, 106, 132, 156] },
    { bw: 100, levels: [22, 42, 64, 88, 116, 144, 170] },
    { bw: 110, levels: [24, 46, 70, 96, 126, 156, 182] },
    { bw: 125, levels: [26, 50, 76, 104, 136, 168, 196] },
  ],
};

const FEMALE: Record<LiftId, BwRow[]> = {
  squat: [
    { bw: 44, levels: [14, 24, 38, 56, 78, 102, 125] },
    { bw: 52, levels: [18, 30, 48, 70, 96, 124, 150] },
    { bw: 56, levels: [20, 34, 54, 78, 106, 136, 164] },
    { bw: 60, levels: [22, 38, 60, 86, 116, 148, 178] },
    { bw: 67, levels: [26, 44, 70, 100, 134, 170, 204] },
    { bw: 75, levels: [30, 52, 82, 116, 154, 194, 232] },
    { bw: 82, levels: [34, 58, 92, 130, 170, 214, 254] },
    { bw: 90, levels: [38, 64, 102, 144, 188, 234, 276] },
  ],
  bench: [
    { bw: 44, levels: [8, 14, 22, 34, 48, 62, 75] },
    { bw: 52, levels: [10, 18, 28, 42, 58, 75, 90] },
    { bw: 56, levels: [12, 20, 32, 48, 64, 82, 98] },
    { bw: 60, levels: [13, 22, 36, 52, 70, 90, 108] },
    { bw: 67, levels: [15, 26, 42, 60, 80, 102, 122] },
    { bw: 75, levels: [18, 30, 50, 70, 92, 116, 138] },
    { bw: 82, levels: [20, 34, 56, 78, 102, 128, 152] },
    { bw: 90, levels: [22, 38, 62, 86, 112, 140, 165] },
  ],
  deadlift: [
    { bw: 44, levels: [18, 32, 50, 74, 102, 132, 158] },
    { bw: 52, levels: [24, 40, 64, 92, 126, 160, 190] },
    { bw: 56, levels: [26, 44, 70, 102, 138, 174, 206] },
    { bw: 60, levels: [30, 50, 78, 112, 150, 188, 222] },
    { bw: 67, levels: [34, 58, 90, 128, 170, 212, 250] },
    { bw: 75, levels: [40, 68, 104, 148, 194, 240, 282] },
    { bw: 82, levels: [44, 76, 116, 164, 214, 264, 308] },
    { bw: 90, levels: [48, 84, 128, 180, 234, 286, 332] },
  ],
  ohp: [
    { bw: 44, levels: [5, 10, 16, 24, 32, 42, 50] },
    { bw: 52, levels: [7, 12, 20, 30, 40, 52, 62] },
    { bw: 56, levels: [8, 14, 22, 32, 44, 56, 66] },
    { bw: 60, levels: [9, 15, 24, 36, 48, 60, 72] },
    { bw: 67, levels: [10, 18, 28, 42, 56, 70, 84] },
    { bw: 75, levels: [12, 22, 34, 48, 64, 80, 96] },
    { bw: 82, levels: [14, 24, 38, 54, 70, 88, 104] },
    { bw: 90, levels: [15, 26, 42, 58, 76, 96, 114] },
  ],
};

export const LEVEL_LABELS = [
  "Sin entrenar",
  "Principiante",
  "Novato",
  "Intermedio",
  "Avanzado",
  "Élite",
  "Clase mundial",
] as const;

export const LEVEL_PERCENTILES = [5, 15, 35, 55, 80, 95, 99.4];

export const LIFT_META: Record<
  LiftId,
  { name: string; short: string; weight: number }
> = {
  squat: { name: "Sentadilla", short: "Sentadilla", weight: 0.3 },
  bench: { name: "Press banca", short: "Banca", weight: 0.25 },
  deadlift: { name: "Peso muerto", short: "Muerto", weight: 0.3 },
  ohp: { name: "Press militar", short: "Militar", weight: 0.15 },
};

export const LIFTS: LiftId[] = ["squat", "bench", "deadlift", "ohp"];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function expectedLevels(sex: Sex, lift: LiftId, bodyweightKg: number) {
  const table = sex === "male" ? MALE[lift] : FEMALE[lift];
  const bw = Math.max(table[0].bw, Math.min(table[table.length - 1].bw, bodyweightKg));

  let i = 0;
  while (i < table.length - 2 && table[i + 1].bw < bw) i += 1;

  const a = table[i];
  const b = table[i + 1];
  const t = (bw - a.bw) / (b.bw - a.bw || 1);

  return a.levels.map((value, index) => lerp(value, b.levels[index], t));
}

export function epley1rm(weightKg: number, reps: number) {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}
