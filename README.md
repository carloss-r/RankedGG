# RankedGG

App web para **ver el progreso de gimnasio** con rangos estilo RPG (de **Madera** a **Mr Olympia**) y comparación contra estándares mundiales de fuerza.

Pensada para el teléfono: interfaz liquid glass, 100% responsive y datos guardados **en el dispositivo** (IndexedDB). Lista para desplegar en Vercel.

## Qué hace

- Muestra tu rango actual y el avance al siguiente.
- Compara sentadilla, press banca, peso muerto y press militar con tablas globales por peso y sexo.
- Guarda marcas en una base local del teléfono (IndexedDB).
- Opcional: ranking global. Cada usuario sube sus mejores marcas y ve la tabla de todos (general y por ejercicio).

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Desplegar en Vercel

1. Sube el repo a GitHub o GitLab.
2. Importa el proyecto en [vercel.com/new](https://vercel.com/new).
3. Framework: Next.js (se detecta solo). Sin variables de entorno.
4. Deploy.

O desde la CLI:

```bash
npx vercel
npx vercel --prod
```

En el iPhone: Safari → Compartir → **Añadir a pantalla de inicio** para usarla como app.

## Ejercicios (JSON)

Todo el catálogo vive en [`src/data/exercises.json`](src/data/exercises.json). Cada ejercicio define:

| Variable | Para qué sirve |
| --- | --- |
| `id`, `name`, `short` | Identificador y nombres en la UI |
| `category`, `pattern` | Compuesto / aislamiento / peso corporal y patrón de movimiento |
| `stat` | Atributo RPG al que aporta (`STR`, `VIT`, `AGI`; se definen en `rpg.stats`) |
| `scoreWeight` | Peso del ejercicio en el score global (0-1) |
| `xpMultiplier` | Multiplicador de XP por punto de score |
| `standards.male/female` | Tabla 1RM por peso corporal (de "sin entrenar" a "clase mundial") |

Para agregar un ejercicio basta con añadir una entrada al JSON: la UI, el motor de rangos y el ranking global lo toman solos.
Si cambias la estructura o los estándares de forma incompatible, sube `version` (los clientes viejos serán rechazados con `catalog_mismatch`).

XP y nivel: `xp = Σ score × xpMultiplier × rpg.xp.perScorePoint`, `nivel = 1 + floor(√(xp / rpg.xp.levelDivisor))`.

## Ranking global (Firebase)

Usa **Firebase Authentication (anónimo)** + **Realtime Database** del proyecto `rankedgg-d64be`. No hay servidor propio: el navegador escribe directo en Firebase y la seguridad la dan las reglas de la base.

- El usuario activa **Ranking global** (pestaña Ranking o Perfil). Firebase le asigna un `uid` anónimo; no hay cuentas ni contraseñas.
- Se publican nombre, rango, nivel, XP, score y mejor 1RM por ejercicio. **El peso corporal y el sexo no se guardan**: el score se calcula en el dispositivo.
- Estructura: `players/{uid}` (ranking general) y `lifts/{lift}/{uid}` (por ejercicio), ambos indexados por `score`.
- Solo el dueño (`auth.uid`) puede escribir su nodo; las reglas validan tipos, rangos (score 0-100) y un tope de 1RM por ejercicio.

### Puesta en marcha (una sola vez)

1. **Authentication → Sign-in method → Anónimo → Habilitar.**
2. **Realtime Database**: debe existir (modo bloqueado está bien) en `https://rankedgg-d64be-default-rtdb.firebaseio.com`.
3. Publica las reglas, con una de estas dos opciones:
   - Consola: *Realtime Database → Reglas* → pega el contenido de [`database.rules.json`](database.rules.json) → **Publicar**.
   - CLI: `npx firebase-tools login` y luego `npx firebase-tools deploy --only database`.
4. Si cambias `src/data/exercises.json`, regenera las reglas con `npm run rules` y vuelve a publicarlas.
5. (Recomendado) En Google Cloud → *Credenciales*, restringe la API key a tus dominios (HTTP referrers).

La configuración web está en [`src/lib/firebase/app.ts`](src/lib/firebase/app.ts) (no es secreta) y se puede sobrescribir con variables `NEXT_PUBLIC_FIREBASE_*`.

### Límites conocidos

- Sin servidor no se puede recalcular el score del lado seguro: alguien con conocimientos podría escribir un score falso dentro de los topes de las reglas. Para un ranking competitivo serio, el siguiente paso es una Cloud Function que valide y escriba.
- La posición cuando estás fuera del top 100 descarga a quienes van delante de ti; es válido para miles de usuarios, no para cientos de miles.
