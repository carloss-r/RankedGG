import { epley1rm, LIFT_META } from "./standards";
import type {
  CoreLiftId,
  Equipment,
  Exercise,
  ExerciseKind,
  LiftId,
  MuscleGroup,
} from "./types";

export const GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "traps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "abs",
  "neck",
  "fullbody",
  "cardio",
];

export const GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Pecho",
  back: "Espalda",
  shoulders: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearms: "Antebrazos",
  traps: "Trapecio",
  quads: "Cuádriceps",
  hamstrings: "Isquios",
  glutes: "Glúteos",
  calves: "Pantorrillas",
  abs: "Abdomen",
  neck: "Cuello",
  fullbody: "Cuerpo completo",
  cardio: "Cardio",
};

export const EQUIPMENT_LIST: Equipment[] = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "smith",
  "bodyweight",
  "kettlebell",
  "band",
  "other",
];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barra",
  dumbbell: "Mancuernas",
  machine: "Máquina",
  cable: "Polea",
  smith: "Smith",
  bodyweight: "Peso corporal",
  kettlebell: "Kettlebell",
  band: "Banda",
  other: "Otro",
};

type Opts = {
  kind?: ExerciseKind;
  /** [ejercicio base, factor]: niveles esperados = niveles del base × factor. */
  ref?: [CoreLiftId, number];
  aliases?: string[];
  unit?: "min";
  core?: boolean;
};

function e(
  id: string,
  name: string,
  group: MuscleGroup,
  equipment: Equipment,
  opts: Opts = {},
): Exercise {
  return {
    id,
    name,
    group,
    equipment,
    kind: opts.kind ?? "weight",
    ...(opts.unit ? { unit: opts.unit } : {}),
    ...(opts.ref ? { ref: { lift: opts.ref[0], factor: opts.ref[1] } } : {}),
    ...(opts.aliases ? { aliases: opts.aliases } : {}),
    ...(opts.core ? { core: true } : {}),
  };
}

/** Peso corporal (repeticiones; el peso extra es opcional). */
function bw(
  id: string,
  name: string,
  group: MuscleGroup,
  opts: Omit<Opts, "kind"> = {},
): Exercise {
  return e(id, name, group, "bodyweight", { ...opts, kind: "bodyweight" });
}

/** Isométricos / por tiempo, en segundos. */
function hold(
  id: string,
  name: string,
  group: MuscleGroup,
  opts: Omit<Opts, "kind" | "unit"> = {},
): Exercise {
  return e(id, name, group, "bodyweight", { ...opts, kind: "timed" });
}

/** Cardio, en minutos. */
function cardio(
  id: string,
  name: string,
  equipment: Equipment,
  aliases?: string[],
): Exercise {
  return e(id, name, "cardio", equipment, { kind: "timed", unit: "min", aliases });
}

/**
 * Catálogo de ejercicios. Las dos primeras líneas de cada bloque son los
 * ejercicios base. Los `ref` son estimaciones: sirven para ubicar el nivel,
 * no son una tabla oficial.
 *
 * Convención de carga: mancuernas = peso POR mancuerna; poleas y máquinas =
 * lo que marca la pila / los discos puestos.
 */
const CHEST: Exercise[] = [
  e("bench", "Press banca", "chest", "barbell", {
    core: true,
    aliases: ["bench press", "press plano"],
  }),
  e("incline_bench", "Press inclinado con barra", "chest", "barbell", {
    ref: ["bench", 0.8],
    aliases: ["press banca inclinado", "incline bench press", "banca inclinada"],
  }),
  e("decline_bench", "Press declinado con barra", "chest", "barbell", {
    ref: ["bench", 1.05],
    aliases: ["press banca declinado", "decline bench press", "banca declinada"],
  }),
  e("paused_bench", "Press banca con pausa", "chest", "barbell", { ref: ["bench", 0.93] }),
  e("floor_press", "Floor press (en el suelo)", "chest", "barbell", { ref: ["bench", 0.9] }),
  e("db_bench", "Press con mancuernas", "chest", "dumbbell", {
    ref: ["bench", 0.38],
    aliases: ["dumbbell bench press", "press plano mancuernas", "press banca mancuernas"],
  }),
  e("incline_db_press", "Press inclinado con mancuernas", "chest", "dumbbell", {
    ref: ["bench", 0.32],
    aliases: ["press banca inclinado mancuernas", "incline dumbbell press"],
  }),
  e("decline_db_press", "Press declinado con mancuernas", "chest", "dumbbell", {
    ref: ["bench", 0.37],
    aliases: ["press banca declinado mancuernas"],
  }),
  e("machine_chest_press", "Press de pecho en máquina", "chest", "machine", {
    ref: ["bench", 0.85],
    aliases: ["chest press"],
  }),
  e("incline_machine_press", "Press inclinado en máquina", "chest", "machine", {
    ref: ["bench", 0.72],
  }),
  e("plate_chest_press", "Press de pecho con palanca (discos)", "chest", "machine", {
    ref: ["bench", 0.95],
    aliases: ["hammer strength chest press"],
  }),
  e("smith_bench", "Press banca en Smith", "chest", "smith", { ref: ["bench", 0.9] }),
  e("smith_incline", "Press inclinado en Smith", "chest", "smith", { ref: ["bench", 0.75] }),
  e("pec_deck", "Pec deck (aperturas en máquina)", "chest", "machine", {
    ref: ["bench", 0.5],
    aliases: ["contractora", "mariposa", "peck deck", "machine fly"],
  }),
  e("db_fly", "Aperturas con mancuernas", "chest", "dumbbell", {
    ref: ["bench", 0.15],
    aliases: ["dumbbell fly"],
  }),
  e("incline_db_fly", "Aperturas inclinadas con mancuernas", "chest", "dumbbell", {
    ref: ["bench", 0.13],
  }),
  e("cable_fly", "Aperturas en polea (cruce de poleas)", "chest", "cable", {
    ref: ["bench", 0.22],
    aliases: ["cable crossover", "cruce de poleas"],
  }),
  e("cable_fly_low", "Aperturas en polea de abajo hacia arriba", "chest", "cable", {
    ref: ["bench", 0.18],
    aliases: ["low to high cable fly"],
  }),
  e("cable_fly_high", "Aperturas en polea de arriba hacia abajo", "chest", "cable", {
    ref: ["bench", 0.2],
    aliases: ["high to low cable fly"],
  }),
  e("single_arm_cable_press", "Press en polea a una mano", "chest", "cable", {
    ref: ["bench", 0.25],
  }),
  e("svend_press", "Svend press (con disco)", "chest", "other"),
  e("db_pullover", "Pullover con mancuerna", "chest", "dumbbell", { ref: ["bench", 0.28] }),
  e("dips", "Fondos en paralelas", "chest", "bodyweight", {
    kind: "bodyweight",
    ref: ["pullup", 1.3],
    aliases: ["dips", "fondos"],
  }),
  e("assisted_dips", "Fondos asistidos (máquina)", "chest", "machine"),
  bw("push_up", "Flexiones", "chest", { aliases: ["push up", "lagartijas", "planchas de pecho"] }),
  bw("incline_push_up", "Flexiones inclinadas (manos elevadas)", "chest"),
  bw("decline_push_up", "Flexiones declinadas (pies elevados)", "chest"),
  bw("knee_push_up", "Flexiones de rodillas", "chest"),
  bw("diamond_push_up", "Flexiones diamante", "triceps"),
  bw("wide_push_up", "Flexiones abiertas", "chest"),
  bw("archer_push_up", "Flexiones arquero", "chest"),
  bw("clap_push_up", "Flexiones con palmada", "chest"),
  bw("weighted_push_up", "Flexiones con lastre", "chest"),
];

const SHOULDERS: Exercise[] = [
  e("ohp", "Press militar", "shoulders", "barbell", {
    core: true,
    aliases: ["overhead press", "press de hombro con barra"],
  }),
  e("seated_ohp", "Press militar sentado", "shoulders", "barbell", { ref: ["ohp", 0.95] }),
  e("push_press", "Push press", "shoulders", "barbell", { ref: ["ohp", 1.25] }),
  e("push_jerk", "Push jerk (envión)", "shoulders", "barbell", {
    ref: ["ohp", 1.3],
    aliases: ["jerk"],
  }),
  e("behind_neck_press", "Press tras nuca", "shoulders", "barbell", { ref: ["ohp", 0.8] }),
  e("z_press", "Z press (sentado en el suelo)", "shoulders", "barbell", { ref: ["ohp", 0.7] }),
  e("db_shoulder_press", "Press de hombro con mancuernas", "shoulders", "dumbbell", {
    ref: ["ohp", 0.4],
    aliases: ["shoulder press", "press militar mancuernas"],
  }),
  e("arnold_press", "Press Arnold", "shoulders", "dumbbell", { ref: ["ohp", 0.35] }),
  e("machine_shoulder_press", "Press de hombro en máquina", "shoulders", "machine", {
    ref: ["ohp", 0.9],
  }),
  e("smith_shoulder_press", "Press de hombro en Smith", "shoulders", "smith", {
    ref: ["ohp", 0.95],
  }),
  e("landmine_press", "Landmine press", "shoulders", "barbell", { ref: ["ohp", 0.6] }),
  e("kb_press", "Press con kettlebell", "shoulders", "kettlebell", { ref: ["ohp", 0.45] }),
  e("log_press", "Log press (strongman)", "shoulders", "other", { ref: ["ohp", 0.9] }),
  e("lateral_raise", "Elevaciones laterales con mancuernas", "shoulders", "dumbbell", {
    ref: ["ohp", 0.14],
    aliases: ["vuelos laterales", "laterales", "lateral raise"],
  }),
  e("cable_lateral_raise", "Elevaciones laterales en polea", "shoulders", "cable", {
    ref: ["ohp", 0.12],
  }),
  e("machine_lateral_raise", "Elevaciones laterales en máquina", "shoulders", "machine", {
    ref: ["ohp", 0.45],
  }),
  e("front_raise", "Elevaciones frontales con mancuernas", "shoulders", "dumbbell", {
    ref: ["ohp", 0.14],
  }),
  e("plate_front_raise", "Elevación frontal con disco", "shoulders", "other", {
    ref: ["ohp", 0.3],
  }),
  e("cable_front_raise", "Elevaciones frontales en polea", "shoulders", "cable", {
    ref: ["ohp", 0.12],
  }),
  e("rear_delt_fly", "Pájaros con mancuernas (deltoide posterior)", "shoulders", "dumbbell", {
    ref: ["ohp", 0.12],
    aliases: ["vuelos posteriores", "reverse fly", "pajaros"],
  }),
  e("reverse_pec_deck", "Pec deck inverso", "shoulders", "machine", {
    ref: ["ohp", 0.4],
    aliases: ["reverse fly machine"],
  }),
  e("cable_rear_delt_fly", "Pájaros en polea", "shoulders", "cable", { ref: ["ohp", 0.1] }),
  e("face_pull", "Face pull", "shoulders", "cable", {
    ref: ["ohp", 0.3],
    aliases: ["jalón a la cara", "tirón a la cara"],
  }),
  e("upright_row", "Remo al mentón con barra", "shoulders", "barbell", { ref: ["ohp", 0.55] }),
  e("cable_upright_row", "Remo al mentón en polea", "shoulders", "cable", { ref: ["ohp", 0.5] }),
  bw("pike_push_up", "Flexiones pike", "shoulders"),
  bw("handstand_push_up", "Flexiones en pino (handstand push-up)", "shoulders", {
    aliases: ["hspu"],
  }),
  hold("handstand_hold", "Parada de manos (handstand)", "shoulders"),
];

const BACK: Exercise[] = [
  e("deadlift", "Peso muerto", "back", "barbell", {
    core: true,
    aliases: ["deadlift", "peso muerto convencional"],
  }),
  e("sumo_deadlift", "Peso muerto sumo", "back", "barbell", { ref: ["deadlift", 1.0] }),
  e("trap_bar_deadlift", "Peso muerto con barra hexagonal", "back", "barbell", {
    ref: ["deadlift", 1.08],
    aliases: ["hex bar deadlift", "trap bar"],
  }),
  e("deficit_deadlift", "Peso muerto con déficit", "back", "barbell", { ref: ["deadlift", 0.9] }),
  e("rack_pull", "Rack pull", "back", "barbell", { ref: ["deadlift", 1.1] }),
  e("snatch_grip_deadlift", "Peso muerto agarre snatch", "back", "barbell", {
    ref: ["deadlift", 0.8],
  }),
  e("axle_deadlift", "Peso muerto con barra gruesa (axle)", "back", "barbell", {
    ref: ["deadlift", 0.8],
  }),
  e("good_morning", "Buenos días con barra", "back", "barbell", {
    ref: ["deadlift", 0.35],
    aliases: ["good morning"],
  }),
  e("row", "Remo con barra", "back", "barbell", {
    core: true,
    aliases: ["barbell row", "remo inclinado"],
  }),
  e("pendlay_row", "Remo Pendlay", "back", "barbell", { ref: ["row", 0.95] }),
  e("yates_row", "Remo Yates", "back", "barbell", { ref: ["row", 1.0] }),
  e("tbar_row", "Remo en T", "back", "barbell", { ref: ["row", 0.95], aliases: ["t-bar row"] }),
  e("meadows_row", "Meadows row", "back", "barbell", { ref: ["row", 0.4] }),
  e("db_row", "Remo con mancuerna a una mano", "back", "dumbbell", {
    ref: ["row", 0.45],
    aliases: ["remo unilateral", "serrucho", "one arm row"],
  }),
  e("chest_supported_db_row", "Remo con mancuernas apoyado en banco inclinado", "back", "dumbbell", {
    ref: ["row", 0.4],
  }),
  e("seated_cable_row", "Remo sentado en polea", "back", "cable", {
    ref: ["row", 0.85],
    aliases: ["remo en polea baja", "seated row"],
  }),
  e("wide_cable_row", "Remo en polea agarre ancho", "back", "cable", { ref: ["row", 0.8] }),
  e("single_arm_cable_row", "Remo en polea a una mano", "back", "cable", { ref: ["row", 0.4] }),
  e("machine_row", "Remo en máquina", "back", "machine", { ref: ["row", 0.9] }),
  e("chest_supported_row", "Remo con apoyo en pecho (máquina)", "back", "machine", {
    ref: ["row", 0.9],
  }),
  e("hammer_row", "Remo con palanca (discos)", "back", "machine", {
    ref: ["row", 0.95],
    aliases: ["high row", "remo palanca", "hammer strength row"],
  }),
  e("smith_row", "Remo en Smith", "back", "smith", { ref: ["row", 0.9] }),
  bw("inverted_row", "Remo invertido", "back", { aliases: ["remo australiano", "australian pull-up"] }),
  e("lat_pulldown", "Jalón al pecho", "back", "cable", {
    ref: ["row", 0.7],
    aliases: ["lat pulldown", "polea al pecho", "jalon"],
  }),
  e("wide_pulldown", "Jalón agarre ancho", "back", "cable", { ref: ["row", 0.68] }),
  e("close_pulldown", "Jalón agarre cerrado (triángulo)", "back", "cable", { ref: ["row", 0.7] }),
  e("neutral_pulldown", "Jalón agarre neutro", "back", "cable", { ref: ["row", 0.7] }),
  e("reverse_pulldown", "Jalón agarre supino", "back", "cable", { ref: ["row", 0.72] }),
  e("single_arm_pulldown", "Jalón a una mano", "back", "cable", { ref: ["row", 0.35] }),
  e("straight_arm_pulldown", "Pullover en polea (brazos rectos)", "back", "cable", {
    ref: ["row", 0.3],
    aliases: ["straight arm pulldown"],
  }),
  e("machine_pulldown", "Jalón en máquina (palanca)", "back", "machine", { ref: ["row", 0.75] }),
  e("cable_pullover", "Pullover en polea", "back", "cable", { ref: ["row", 0.3] }),
  e("pullup", "Dominadas", "back", "bodyweight", {
    core: true,
    kind: "bodyweight",
    aliases: ["pull up", "pull-up", "barra fija"],
  }),
  bw("chin_up", "Dominadas supinas (chin-up)", "back", { ref: ["pullup", 1.15] }),
  bw("neutral_pullup", "Dominadas agarre neutro", "back", { ref: ["pullup", 1.1] }),
  bw("wide_pullup", "Dominadas agarre ancho", "back", { ref: ["pullup", 0.9] }),
  e("assisted_pullup", "Dominadas asistidas (máquina)", "back", "machine"),
  bw("muscle_up", "Muscle-up", "back"),
  bw("back_extension", "Extensión lumbar (hiperextensión)", "back", {
    ref: ["deadlift", 0.25],
    aliases: ["hyperextension", "banco romano"],
  }),
  e("reverse_hyper", "Reverse hyper", "back", "machine"),
  hold("superman", "Superman (isométrico)", "back"),
  hold("dead_hang", "Colgarse de la barra (dead hang)", "forearms"),
  hold("front_lever", "Front lever", "back"),
  hold("back_lever", "Back lever", "back"),
];

const TRAPS: Exercise[] = [
  e("barbell_shrug", "Encogimientos con barra", "traps", "barbell", {
    ref: ["deadlift", 0.85],
    aliases: ["barbell shrug", "trapecio con barra"],
  }),
  e("db_shrug", "Encogimientos con mancuernas", "traps", "dumbbell", {
    ref: ["deadlift", 0.35],
    aliases: ["dumbbell shrug"],
  }),
  e("smith_shrug", "Encogimientos en Smith", "traps", "smith", { ref: ["deadlift", 0.8] }),
  e("machine_shrug", "Encogimientos en máquina", "traps", "machine", { ref: ["deadlift", 0.8] }),
  e("trap_bar_shrug", "Encogimientos con barra hexagonal", "traps", "barbell", {
    ref: ["deadlift", 0.85],
  }),
];

const BICEPS: Exercise[] = [
  e("curl", "Curl con barra", "biceps", "barbell", {
    core: true,
    aliases: ["barbell curl", "curl de biceps"],
  }),
  e("ez_curl", "Curl con barra Z", "biceps", "barbell", { ref: ["curl", 0.95], aliases: ["ez curl"] }),
  e("db_curl", "Curl con mancuernas", "biceps", "dumbbell", {
    ref: ["curl", 0.45],
    aliases: ["dumbbell curl", "curl alterno"],
  }),
  e("hammer_curl", "Curl martillo", "biceps", "dumbbell", { ref: ["curl", 0.5] }),
  e("cross_body_hammer", "Curl martillo cruzado", "biceps", "dumbbell", { ref: ["curl", 0.48] }),
  e("incline_db_curl", "Curl inclinado con mancuernas", "biceps", "dumbbell", { ref: ["curl", 0.4] }),
  e("concentration_curl", "Curl concentrado", "biceps", "dumbbell", { ref: ["curl", 0.4] }),
  e("spider_curl", "Spider curl", "biceps", "dumbbell", { ref: ["curl", 0.4] }),
  e("preacher_curl", "Curl predicador con barra", "biceps", "barbell", {
    ref: ["curl", 0.85],
    aliases: ["curl scott", "scott curl"],
  }),
  e("machine_preacher", "Curl predicador en máquina", "biceps", "machine", { ref: ["curl", 0.9] }),
  e("db_preacher", "Curl predicador con mancuerna", "biceps", "dumbbell", { ref: ["curl", 0.4] }),
  e("cable_curl", "Curl en polea baja", "biceps", "cable", { ref: ["curl", 0.8] }),
  e("cable_rope_hammer", "Curl martillo en polea con cuerda", "biceps", "cable", {
    ref: ["curl", 0.75],
  }),
  e("bayesian_curl", "Curl bayesiano en polea", "biceps", "cable", { ref: ["curl", 0.35] }),
  e("high_cable_curl", "Curl en polea alta (doble bíceps)", "biceps", "cable", {
    ref: ["curl", 0.35],
  }),
  e("drag_curl", "Drag curl", "biceps", "barbell", { ref: ["curl", 0.9] }),
  e("zottman_curl", "Curl Zottman", "biceps", "dumbbell", { ref: ["curl", 0.3] }),
  e("reverse_curl", "Curl inverso con barra", "forearms", "barbell", { ref: ["curl", 0.65] }),
];

const TRICEPS: Exercise[] = [
  e("tricep", "Extensiones de tríceps", "triceps", "cable", {
    core: true,
    aliases: ["tricep extension", "triceps extension"],
  }),
  e("close_grip_bench", "Press banca agarre cerrado", "triceps", "barbell", {
    ref: ["bench", 0.85],
    aliases: ["close grip bench press"],
  }),
  e("skullcrusher", "Press francés con barra Z", "triceps", "barbell", {
    ref: ["tricep", 0.9],
    aliases: ["skull crusher", "rompecráneos", "press francés", "extension tumbado"],
  }),
  e("db_skullcrusher", "Press francés con mancuernas", "triceps", "dumbbell", {
    ref: ["tricep", 0.4],
  }),
  e("overhead_ez_ext", "Press francés de pie (barra Z)", "triceps", "barbell", {
    ref: ["tricep", 0.85],
  }),
  e("jm_press", "JM press", "triceps", "barbell", { ref: ["tricep", 1.0] }),
  e("tate_press", "Tate press", "triceps", "dumbbell", { ref: ["tricep", 0.35] }),
  e("pushdown_rope", "Extensión en polea con cuerda", "triceps", "cable", {
    ref: ["tricep", 0.9],
    aliases: ["jalón de tríceps", "pushdown", "triceps pushdown"],
  }),
  e("pushdown_bar", "Extensión en polea con barra recta", "triceps", "cable", {
    ref: ["tricep", 1.0],
  }),
  e("pushdown_vbar", "Extensión en polea con barra V", "triceps", "cable", { ref: ["tricep", 1.0] }),
  e("reverse_pushdown", "Extensión en polea agarre supino", "triceps", "cable", {
    ref: ["tricep", 0.8],
  }),
  e("overhead_cable_ext", "Extensión sobre la cabeza en polea", "triceps", "cable", {
    ref: ["tricep", 0.8],
  }),
  e("overhead_db_ext", "Extensión sobre la cabeza con mancuerna", "triceps", "dumbbell", {
    ref: ["tricep", 0.65],
    aliases: ["extensión tras nuca", "french press mancuerna"],
  }),
  e("db_kickback", "Patada de tríceps con mancuerna", "triceps", "dumbbell", {
    ref: ["tricep", 0.3],
    aliases: ["kickback"],
  }),
  e("cable_kickback_triceps", "Patada de tríceps en polea", "triceps", "cable", {
    ref: ["tricep", 0.25],
  }),
  e("machine_tricep_ext", "Extensión de tríceps en máquina", "triceps", "machine", {
    ref: ["tricep", 1.1],
  }),
  e("dip_machine", "Fondos de tríceps en máquina", "triceps", "machine", { ref: ["tricep", 1.4] }),
  bw("bench_dip", "Fondos en banco", "triceps", { aliases: ["bench dips"] }),
  bw("close_grip_push_up", "Flexiones con agarre cerrado", "triceps"),
];

const FOREARMS: Exercise[] = [
  e("wrist_curl", "Curl de muñeca con barra", "forearms", "barbell", { ref: ["curl", 0.5] }),
  e("reverse_wrist_curl", "Curl de muñeca inverso", "forearms", "barbell", { ref: ["curl", 0.35] }),
  e("db_wrist_curl", "Curl de muñeca con mancuerna", "forearms", "dumbbell", {
    ref: ["curl", 0.25],
  }),
  e("farmer_walk", "Paseo del granjero (carry)", "forearms", "dumbbell", {
    aliases: ["farmers walk", "farmer carry", "acarreo"],
  }),
  e("plate_pinch", "Pinza con discos (pinch)", "forearms", "other"),
  e("wrist_roller", "Rodillo de muñeca", "forearms", "other"),
  e("grip_crusher", "Pinza de agarre (grip)", "forearms", "other"),
];

const QUADS: Exercise[] = [
  e("squat", "Sentadilla", "quads", "barbell", {
    core: true,
    aliases: ["back squat", "sentadilla trasera", "sentadilla libre"],
  }),
  e("front_squat", "Sentadilla frontal", "quads", "barbell", { ref: ["squat", 0.8] }),
  e("box_squat", "Sentadilla al cajón", "quads", "barbell", { ref: ["squat", 0.95] }),
  e("pause_squat", "Sentadilla con pausa", "quads", "barbell", { ref: ["squat", 0.85] }),
  e("zercher_squat", "Sentadilla Zercher", "quads", "barbell", { ref: ["squat", 0.7] }),
  e("safety_bar_squat", "Sentadilla con barra de seguridad", "quads", "barbell", {
    ref: ["squat", 0.95],
  }),
  e("overhead_squat", "Sentadilla overhead", "quads", "barbell", { ref: ["squat", 0.5] }),
  e("thruster", "Thruster", "fullbody", "barbell", { ref: ["squat", 0.45] }),
  e("goblet_squat", "Sentadilla goblet", "quads", "dumbbell", {
    ref: ["squat", 0.3],
    aliases: ["goblet"],
  }),
  e("hack_squat", "Sentadilla hack (máquina)", "quads", "machine", {
    ref: ["squat", 1.0],
    aliases: ["hack squat"],
  }),
  e("pendulum_squat", "Sentadilla péndulo", "quads", "machine", { ref: ["squat", 1.0] }),
  e("belt_squat", "Sentadilla belt squat", "quads", "machine", { ref: ["squat", 0.9] }),
  e("smith_squat", "Sentadilla en Smith", "quads", "smith", { ref: ["squat", 0.95] }),
  e("leg_press", "Prensa de piernas (45°)", "quads", "machine", {
    ref: ["squat", 1.9],
    aliases: ["prensa", "leg press"],
  }),
  e("horizontal_leg_press", "Prensa horizontal (sentado)", "quads", "machine", {
    ref: ["squat", 1.3],
  }),
  e("leg_extension", "Extensión de cuádriceps", "quads", "machine", {
    ref: ["squat", 0.5],
    aliases: ["sillón de cuádriceps", "leg extension", "extension de pierna"],
  }),
  e("bulgarian_split_squat", "Sentadilla búlgara con mancuernas", "quads", "dumbbell", {
    ref: ["squat", 0.22],
    aliases: ["bulgarian", "split squat bulgara"],
  }),
  e("split_squat", "Sentadilla dividida (split squat)", "quads", "dumbbell", {
    ref: ["squat", 0.22],
  }),
  e("lunge_barbell", "Zancadas con barra", "quads", "barbell", {
    ref: ["squat", 0.6],
    aliases: ["lunge", "estocadas"],
  }),
  e("reverse_lunge", "Zancadas inversas con barra", "quads", "barbell", { ref: ["squat", 0.6] }),
  e("walking_lunge", "Zancadas caminando con mancuernas", "quads", "dumbbell", {
    ref: ["squat", 0.22],
    aliases: ["walking lunge", "estocadas caminando"],
  }),
  e("step_up", "Step-up con mancuernas", "quads", "dumbbell", {
    ref: ["squat", 0.2],
    aliases: ["subida al cajón", "step up"],
  }),
  e("hip_adduction_machine", "Aducción de cadera (máquina)", "quads", "machine", {
    ref: ["squat", 0.7],
    aliases: ["aductores", "adductor machine"],
  }),
  bw("bodyweight_squat", "Sentadilla con peso corporal", "quads", { aliases: ["air squat"] }),
  bw("jump_squat", "Sentadilla con salto", "quads"),
  bw("sissy_squat", "Sissy squat", "quads"),
  bw("pistol_squat", "Sentadilla pistol (a una pierna)", "quads"),
  bw("bodyweight_lunge", "Zancadas con peso corporal", "quads"),
  hold("wall_sit", "Sentadilla isométrica en pared (wall sit)", "quads"),
];

const HAMSTRINGS: Exercise[] = [
  e("romanian_deadlift", "Peso muerto rumano", "hamstrings", "barbell", {
    ref: ["deadlift", 0.8],
    aliases: ["rdl", "romanian deadlift"],
  }),
  e("stiff_leg_deadlift", "Peso muerto piernas rígidas", "hamstrings", "barbell", {
    ref: ["deadlift", 0.75],
    aliases: ["stiff leg"],
  }),
  e("db_rdl", "Peso muerto rumano con mancuernas", "hamstrings", "dumbbell", {
    ref: ["deadlift", 0.35],
  }),
  e("single_leg_rdl", "Peso muerto a una pierna", "hamstrings", "dumbbell", {
    ref: ["deadlift", 0.15],
  }),
  e("leg_curl_lying", "Curl femoral tumbado", "hamstrings", "machine", {
    ref: ["squat", 0.45],
    aliases: ["curl femoral", "leg curl", "femoral acostado"],
  }),
  e("leg_curl_seated", "Curl femoral sentado", "hamstrings", "machine", {
    ref: ["squat", 0.45],
    aliases: ["femoral sentado"],
  }),
  e("leg_curl_standing", "Curl femoral de pie (a una pierna)", "hamstrings", "machine", {
    ref: ["squat", 0.25],
  }),
  e("cable_leg_curl", "Curl femoral en polea", "hamstrings", "cable"),
  bw("nordic_curl", "Curl nórdico", "hamstrings", { aliases: ["nordic hamstring"] }),
  bw("glute_ham_raise", "Glute-ham raise (GHR)", "hamstrings", { aliases: ["ghr"] }),
  bw("stability_ball_curl", "Curl femoral con balón", "hamstrings"),
  bw("slider_leg_curl", "Curl femoral con deslizadores", "hamstrings"),
];

const GLUTES: Exercise[] = [
  e("hip_thrust", "Hip thrust con barra", "glutes", "barbell", {
    ref: ["squat", 1.1],
    aliases: ["empuje de cadera", "hip thrust"],
  }),
  e("smith_hip_thrust", "Hip thrust en Smith", "glutes", "smith", { ref: ["squat", 1.05] }),
  e("machine_hip_thrust", "Hip thrust en máquina", "glutes", "machine", { ref: ["squat", 1.0] }),
  e("glute_bridge", "Puente de glúteos con barra", "glutes", "barbell", { ref: ["squat", 1.0] }),
  e("cable_pull_through", "Pull-through en polea", "glutes", "cable", { ref: ["squat", 0.4] }),
  e("glute_kickback_cable", "Patada de glúteo en polea", "glutes", "cable", {
    ref: ["squat", 0.2],
    aliases: ["glute kickback"],
  }),
  e("glute_kickback_machine", "Patada de glúteo en máquina", "glutes", "machine", {
    ref: ["squat", 0.5],
  }),
  e("hip_abduction_machine", "Abducción de cadera (máquina)", "glutes", "machine", {
    ref: ["squat", 0.7],
    aliases: ["abductores", "abductor machine"],
  }),
  e("cable_hip_abduction", "Abducción de cadera en polea", "glutes", "cable"),
  e("banded_walk", "Caminata lateral con banda", "glutes", "band", { kind: "bodyweight" }),
  bw("bodyweight_glute_bridge", "Puente de glúteos (peso corporal)", "glutes"),
  bw("single_leg_hip_thrust", "Hip thrust a una pierna", "glutes"),
  bw("clamshell", "Clamshell (almeja)", "glutes"),
  bw("donkey_kick", "Patada de burro (cuadrupedia)", "glutes"),
  bw("fire_hydrant", "Fire hydrant", "glutes"),
];

const CALVES: Exercise[] = [
  e("standing_calf_raise", "Elevación de talones de pie (máquina)", "calves", "machine", {
    ref: ["squat", 0.8],
    aliases: ["gemelos de pie", "pantorrillas de pie", "calf raise"],
  }),
  e("seated_calf_raise", "Elevación de talones sentado", "calves", "machine", {
    ref: ["squat", 0.5],
    aliases: ["gemelos sentado", "soleo"],
  }),
  e("leg_press_calf", "Gemelos en prensa", "calves", "machine", { ref: ["squat", 1.1] }),
  e("smith_calf_raise", "Gemelos en Smith", "calves", "smith", { ref: ["squat", 0.8] }),
  e("donkey_calf_raise", "Gemelos en burro (donkey)", "calves", "machine", { ref: ["squat", 0.9] }),
  e("single_leg_calf_raise", "Gemelos a una pierna con mancuerna", "calves", "dumbbell", {
    ref: ["squat", 0.2],
  }),
  e("tibialis_raise", "Elevación de tibial anterior", "calves", "machine"),
  bw("bodyweight_calf_raise", "Elevación de talones (peso corporal)", "calves"),
  bw("jump_rope_calf", "Saltos de pantorrilla", "calves"),
];

const ABS: Exercise[] = [
  bw("crunch", "Crunch abdominal", "abs", { aliases: ["abdominales"] }),
  bw("situp", "Sit-ups", "abs", { aliases: ["abdominales completos"] }),
  bw("decline_situp", "Sit-ups en banco declinado", "abs"),
  bw("reverse_crunch", "Crunch inverso", "abs"),
  bw("bicycle_crunch", "Crunch bicicleta", "abs"),
  bw("v_up", "V-ups", "abs"),
  bw("lying_leg_raise", "Elevación de piernas tumbado", "abs"),
  bw("hanging_leg_raise", "Elevación de piernas colgado", "abs", { aliases: ["leg raise"] }),
  bw("hanging_knee_raise", "Elevación de rodillas colgado", "abs"),
  bw("captain_chair_raise", "Elevación de piernas en silla romana", "abs"),
  bw("toes_to_bar", "Toes to bar", "abs"),
  bw("ab_wheel", "Rueda abdominal (ab wheel)", "abs", { aliases: ["rollout"] }),
  bw("russian_twist", "Giros rusos", "abs", { aliases: ["russian twist"] }),
  bw("dead_bug", "Dead bug", "abs"),
  bw("bird_dog", "Bird dog", "abs"),
  bw("mountain_climber", "Escaladores (mountain climbers)", "abs"),
  bw("dragon_flag", "Dragon flag", "abs"),
  hold("plank", "Plancha", "abs", { aliases: ["plank"] }),
  hold("side_plank", "Plancha lateral", "abs"),
  hold("hollow_hold", "Hollow hold", "abs"),
  hold("l_sit", "L-sit", "abs"),
  e("cable_crunch", "Crunch en polea alta", "abs", "cable", { aliases: ["crunch de rodillas en polea"] }),
  e("machine_crunch", "Crunch en máquina", "abs", "machine"),
  e("woodchopper", "Leñador en polea (woodchopper)", "abs", "cable", { aliases: ["wood chop"] }),
  e("pallof_press", "Pallof press", "abs", "cable"),
  e("db_side_bend", "Flexión lateral con mancuerna", "abs", "dumbbell"),
  e("landmine_twist", "Giros con landmine", "abs", "barbell"),
  e("barbell_rollout", "Rollout con barra", "abs", "barbell"),
];

const NECK: Exercise[] = [
  e("neck_flexion", "Flexión de cuello con disco/arnés", "neck", "other"),
  e("neck_extension", "Extensión de cuello con disco/arnés", "neck", "other"),
  e("neck_machine", "Cuello en máquina", "neck", "machine"),
];

const FULLBODY: Exercise[] = [
  e("clean", "Cargada (clean)", "fullbody", "barbell", { ref: ["deadlift", 0.65], aliases: ["clean"] }),
  e("power_clean", "Power clean", "fullbody", "barbell", { ref: ["deadlift", 0.6] }),
  e("hang_clean", "Hang clean", "fullbody", "barbell", { ref: ["deadlift", 0.55] }),
  e("hang_power_clean", "Hang power clean", "fullbody", "barbell", { ref: ["deadlift", 0.5] }),
  e("clean_and_jerk", "Cargada y envión", "fullbody", "barbell", {
    ref: ["deadlift", 0.6],
    aliases: ["clean and jerk"],
  }),
  e("clean_pull", "Clean pull", "fullbody", "barbell", { ref: ["deadlift", 0.95] }),
  e("snatch", "Arrancada (snatch)", "fullbody", "barbell", { ref: ["deadlift", 0.45] }),
  e("power_snatch", "Power snatch", "fullbody", "barbell", { ref: ["deadlift", 0.4] }),
  e("hang_snatch", "Hang snatch", "fullbody", "barbell", { ref: ["deadlift", 0.4] }),
  e("snatch_pull", "Snatch pull", "fullbody", "barbell", { ref: ["deadlift", 0.8] }),
  e("kb_swing", "Swing con kettlebell", "fullbody", "kettlebell", {
    ref: ["deadlift", 0.25],
    aliases: ["kettlebell swing", "pesa rusa"],
  }),
  e("turkish_get_up", "Turkish get-up", "fullbody", "kettlebell", { ref: ["ohp", 0.45] }),
  e("kb_snatch", "Arrancada con kettlebell", "fullbody", "kettlebell", { ref: ["ohp", 0.35] }),
  e("kb_clean", "Cargada con kettlebell", "fullbody", "kettlebell"),
  e("sled_push", "Empuje de trineo (sled)", "fullbody", "other", { aliases: ["prowler", "sled push"] }),
  e("sled_pull", "Arrastre de trineo", "fullbody", "other"),
  e("sandbag_carry", "Acarreo de saco de arena", "fullbody", "other"),
  e("yoke_walk", "Yoke walk (strongman)", "fullbody", "other"),
  e("atlas_stone", "Piedra Atlas", "fullbody", "other"),
  e("tire_flip", "Volteo de neumático", "fullbody", "other", { kind: "bodyweight" }),
  e("slam_ball", "Slam ball", "fullbody", "other"),
  e("wall_ball", "Wall ball", "fullbody", "other"),
  bw("burpee", "Burpees", "fullbody"),
  bw("box_jump", "Saltos al cajón (box jump)", "fullbody"),
  bw("broad_jump", "Salto de longitud", "fullbody"),
  bw("rope_climb", "Subida de cuerda", "fullbody"),
  bw("bear_crawl", "Caminata de oso", "fullbody"),
  hold("planche", "Planche", "fullbody"),
  hold("human_flag", "Bandera humana (human flag)", "fullbody"),
  e("yoga", "Yoga", "fullbody", "bodyweight", { kind: "timed", unit: "min" }),
  e("stretching", "Estiramientos / movilidad", "fullbody", "bodyweight", {
    kind: "timed",
    unit: "min",
    aliases: ["movilidad", "flexibilidad"],
  }),
];

const CARDIO: Exercise[] = [
  cardio("treadmill", "Cinta de correr", "machine", ["caminadora", "treadmill"]),
  cardio("incline_walk", "Caminata inclinada en cinta", "machine"),
  cardio("outdoor_run", "Correr (exterior)", "other", ["running", "trotar"]),
  cardio("walking", "Caminata", "other", ["caminar"]),
  cardio("hiking", "Senderismo", "other"),
  cardio("stationary_bike", "Bicicleta estática", "machine", ["bike"]),
  cardio("spinning", "Spinning", "machine", ["cycling indoor"]),
  cardio("outdoor_cycling", "Ciclismo (exterior)", "other", ["bicicleta"]),
  cardio("assault_bike", "Assault bike", "machine", ["air bike"]),
  cardio("elliptical", "Elíptica", "machine", ["eliptica"]),
  cardio("rowing_machine", "Remo ergómetro (concept2)", "machine", ["rowing", "remo cardio"]),
  cardio("ski_erg", "SkiErg", "machine"),
  cardio("stair_climber", "Escaladora (stairmaster)", "machine", ["stairmaster", "escalera"]),
  cardio("jump_rope", "Saltar la cuerda", "other", ["comba", "jump rope"]),
  cardio("swimming", "Natación", "other", ["nadar", "alberca"]),
  cardio("battle_ropes", "Cuerdas de batalla", "other", ["battle ropes"]),
  cardio("boxing_bag", "Saco de boxeo", "other", ["boxeo"]),
  cardio("hiit", "HIIT / intervalos", "other", ["intervalos"]),
];

export const EXERCISES: Exercise[] = [
  ...CHEST,
  ...BACK,
  ...SHOULDERS,
  ...BICEPS,
  ...TRICEPS,
  ...FOREARMS,
  ...TRAPS,
  ...QUADS,
  ...HAMSTRINGS,
  ...GLUTES,
  ...CALVES,
  ...ABS,
  ...NECK,
  ...FULLBODY,
  ...CARDIO,
];

export const EXERCISE_MAP: Map<LiftId, Exercise> = new Map(
  EXERCISES.map((exercise) => [exercise.id, exercise]),
);

export function getCatalogExercise(id: LiftId): Exercise | undefined {
  return EXERCISE_MAP.get(id);
}

/** Nombre corto: el de LIFT_META para los base, el nombre completo para el resto. */
export function shortName(id: LiftId, exercise?: Exercise): string {
  if (id in LIFT_META) return LIFT_META[id as CoreLiftId].short;
  return exercise?.name ?? "Ejercicio eliminado";
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function searchExercises(
  list: Exercise[],
  query: string,
  group: MuscleGroup | "all" = "all",
  equipment: Equipment | "all" = "all",
): Exercise[] {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  return list.filter((exercise) => {
    if (group !== "all" && exercise.group !== group) return false;
    if (equipment !== "all" && exercise.equipment !== equipment) return false;
    if (tokens.length === 0) return true;
    const haystack = normalizeText(
      [
        exercise.name,
        ...(exercise.aliases ?? []),
        GROUP_LABELS[exercise.group],
        EQUIPMENT_LABELS[exercise.equipment],
      ].join(" "),
    );
    return tokens.every((token) => haystack.includes(token));
  });
}

/** 1RM estimado de una serie según el tipo de ejercicio. */
export function estimateOneRm(
  exercise: Exercise | undefined,
  weightKg: number,
  reps: number,
): number {
  const kind = exercise?.kind ?? "weight";
  if (kind === "timed") return 0;
  if (kind === "bodyweight" && weightKg <= 0) return 0;
  return Math.round(epley1rm(weightKg, reps) * 10) / 10;
}
