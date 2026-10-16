// Genera database.rules.json a partir de src/data/exercises.json.
// Uso: npm run rules   (después: firebase deploy --only database, o pegar en la consola)
//
// Modelo:
//   users/{uid}                        registro (nombre completo) — lo lee/escribe solo su dueño
//   players/{uid}                      ranking general
//   muscles/{muscle}/{uid}             ranking por grupo muscular
//   lifts/{lift}/{uid}                 ranking por ejercicio (1RM equivalente al ejercicio base)
//   variants/{lift}/{variant}/{uid}    ranking por variante (1RM real de la variante)
//
// Verificación en la base: para PUBLICAR en cualquier ranking hay que ser el dueño del nodo
// (auth.uid === $uid), tener users/{uid} con status "active", y el nombre publicado debe ser
// exactamente el publicName registrado. Borrar tus propios datos siempre está permitido.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "src/data/exercises.json"), "utf8"));
const factor = catalog.validation.maxPlausibleOfWorldClass;

const NAME_MAX = 40; // publicName puede ser "Carlos R." (24) o el nombre completo recortado (40)

// Tope de 1RM por ejercicio: marca de clase mundial más alta de las tablas × tolerancia.
const maxByLift = {};
for (const ex of catalog.exercises) {
  const rows = [...ex.standards.male, ...ex.standards.female];
  const top = Math.max(...rows.map((row) => row.levels[row.levels.length - 1]));
  maxByLift[ex.id] = Math.ceil(top * factor);
}

const num = (min, max) => ({
  ".validate": `newData.isNumber() && newData.val() >= ${min} && newData.val() <= ${max}`,
});
const str = (min, max) => ({
  ".validate": `newData.isString() && newData.val().length >= ${min} && newData.val().length <= ${max}`,
});
const rank = { ".validate": "newData.isString() && newData.val().matches(/^[a-z]{3,12}$/)" };

// El nombre publicado debe coincidir con el registrado en users/{uid}.
const publishedName = {
  ".validate":
    `newData.isString() && newData.val().length >= 1 && newData.val().length <= ${NAME_MAX} && ` +
    "newData.val() === root.child('users').child($uid).child('publicName').val()",
};

// Escribir en un ranking: dueño del nodo y, si no es un borrado, registro activo en users/.
const WRITE =
  "auth != null && auth.uid === $uid && (!newData.exists() || " +
  "root.child('users').child(auth.uid).child('status').val() === 'active')";

const rowRules = (extra) => ({
  ".write": WRITE,
  ...extra,
  $other: { ".validate": false },
});

const liftRow = (max) =>
  rowRules({
    ".validate": "newData.hasChildren(['name','rankId','level','score','oneRm'])",
    name: publishedName,
    rankId: rank,
    level: num(1, 500),
    score: num(0, 100),
    oneRm: num(0.1, max),
  });

// users/{uid}: registro privado (solo su dueño lo lee y lo escribe).
const users = {
  $uid: {
    ".read": "auth != null && auth.uid === $uid",
    ".write": "auth != null && auth.uid === $uid",
    ".validate": "newData.hasChildren(['fullName','publicName','status','createdAt','updatedAt'])",
    fullName: str(3, 80),
    publicName: str(1, NAME_MAX),
    status: { ".validate": "newData.isString() && newData.val() === 'active'" },
    createdAt: { ".validate": "newData.isNumber()" },
    updatedAt: { ".validate": "newData.isNumber()" },
    $other: { ".validate": false },
  },
};

// players/{uid}: ranking general.
const bests = {};
for (const [lift, max] of Object.entries(maxByLift)) bests[lift] = num(0.1, max);
bests.$other = { ".validate": false };

const players = {
  ".read": true,
  ".indexOn": ["score"],
  $uid: rowRules({
    ".validate":
      "newData.hasChildren(['name','rankId','level','xp','score','percentile','updatedAt','bests'])",
    name: publishedName,
    rankId: rank,
    level: num(1, 500),
    xp: num(0, 1000000),
    score: num(0, 100),
    percentile: num(0, 100),
    updatedAt: { ".validate": "newData.isNumber()" },
    bests,
  }),
};

// muscles/{muscle}/{uid}
const muscles = { ".read": true };
for (const muscle of Object.keys(catalog.muscles)) {
  const inMuscle = catalog.exercises.filter((ex) => ex.muscle === muscle).length;
  muscles[muscle] = {
    ".indexOn": ["score"],
    $uid: rowRules({
      ".validate": "newData.hasChildren(['name','rankId','level','score','lifts'])",
      name: publishedName,
      rankId: rank,
      level: num(1, 500),
      score: num(0, 100),
      lifts: num(1, Math.max(1, inMuscle)),
    }),
  };
}
muscles.$other = { ".validate": false };

// lifts/{lift}/{uid} y variants/{lift}/{variant}/{uid}
const lifts = { ".read": true };
const variants = { ".read": true };
for (const ex of catalog.exercises) {
  const max = maxByLift[ex.id];
  lifts[ex.id] = { ".indexOn": ["score"], $uid: liftRow(max) };

  variants[ex.id] = {};
  for (const variant of ex.variants) {
    // La marca real de la variante puede superar la del ejercicio base si su factor es > 1.
    const variantMax = Math.ceil(max * Math.max(1, variant.factor));
    variants[ex.id][variant.id] = { ".indexOn": ["score"], $uid: liftRow(variantMax) };
  }
  variants[ex.id].$other = { ".validate": false };
}
lifts.$other = { ".validate": false };
variants.$other = { ".validate": false };

const rules = {
  rules: { ".read": false, ".write": false, users, players, muscles, lifts, variants },
};
fs.writeFileSync(path.join(root, "database.rules.json"), JSON.stringify(rules, null, 2) + "\n");

const nVariants = catalog.exercises.reduce((n, ex) => n + ex.variants.length, 0);
console.log(
  `database.rules.json generado: ${catalog.exercises.length} ejercicios, ` +
    `${nVariants} variantes, ${Object.keys(catalog.muscles).length} músculos.`,
);
