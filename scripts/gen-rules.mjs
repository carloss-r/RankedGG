// Genera database.rules.json a partir de src/data/exercises.json.
// Uso: npm run rules   (después: firebase deploy --only database, o pegar en la consola)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "src/data/exercises.json"), "utf8"));
const factor = catalog.validation.maxPlausibleOfWorldClass;

const maxByLift = {};
for (const ex of catalog.exercises) {
  const rows = [...ex.standards.male, ...ex.standards.female];
  const top = Math.max(...rows.map((row) => row.levels[row.levels.length - 1]));
  maxByLift[ex.id] = Math.ceil(top * factor);
}

const num = (min, max) => ({ ".validate": `newData.isNumber() && newData.val() >= ${min} && newData.val() <= ${max}` });
const str = (min, max) => ({ ".validate": `newData.isString() && newData.val().length >= ${min} && newData.val().length <= ${max}` });
const rank = { ".validate": "newData.isString() && newData.val().matches(/^[a-z]{3,12}$/)" };

const bests = {};
for (const [lift, max] of Object.entries(maxByLift)) bests[lift] = num(0.1, max);
bests["$other"] = { ".validate": false };

const players = {
  ".read": true,
  ".indexOn": ["score"],
  "$uid": {
    ".write": "auth != null && auth.uid === $uid",
    ".validate": "newData.hasChildren(['name','rankId','level','xp','score','percentile','updatedAt','bests'])",
    name: str(1, 24),
    rankId: rank,
    level: num(1, 500),
    xp: num(0, 1000000),
    score: num(0, 100),
    percentile: num(0, 100),
    updatedAt: { ".validate": "newData.isNumber()" },
    bests,
    "$other": { ".validate": false },
  },
};

const lifts = { ".read": true };
for (const [lift, max] of Object.entries(maxByLift)) {
  lifts[lift] = {
    ".indexOn": ["score"],
    "$uid": {
      ".write": "auth != null && auth.uid === $uid",
      ".validate": "newData.hasChildren(['name','rankId','level','score','oneRm'])",
      name: str(1, 24),
      rankId: rank,
      level: num(1, 500),
      score: num(0, 100),
      oneRm: num(0.1, max),
      "$other": { ".validate": false },
    },
  };
}
lifts["$other"] = { ".validate": false };

const rules = { rules: { ".read": false, ".write": false, players, lifts } };
fs.writeFileSync(path.join(root, "database.rules.json"), JSON.stringify(rules, null, 2) + "\n");
console.log("database.rules.json generado. Topes de 1RM:", maxByLift);
