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

## Ranking global

- El usuario activa **Ranking global** (pestaña Ranking o Perfil). Se crea una identidad anónima en el dispositivo (`playerId` + `secret`); no hay cuentas.
- El cliente envía a `POST /api/scores` solo nombre, sexo, peso corporal y mejor 1RM por ejercicio. **El servidor recalcula** score, rango, XP y nivel, y rechaza marcas implausibles (> 1.35× clase mundial para ese peso).
- `GET /api/leaderboard?lift=squat&limit=50&playerId=...` devuelve el ranking general o por ejercicio y tu posición. El peso corporal nunca se expone.
- `DELETE /api/scores` saca al usuario del ranking.

### Configurar el backend (Supabase)

1. Crea un proyecto en Supabase y ejecuta [`supabase/schema.sql`](supabase/schema.sql) en el SQL editor.
2. En Vercel (o en `.env.local`) define, solo del lado servidor:

```bash
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

Sin esas variables, en desarrollo se usa un almacén en memoria (se pierde al reiniciar) y en producción la API responde `503 backend_not_configured`.
Para usar otro proveedor, implementa la interfaz `PlayerStore` en [`src/lib/server/store.ts`](src/lib/server/store.ts).
