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
| `muscle` | Grupo muscular principal (clave de `muscles`: piernas, pecho, espalda, hombros, brazos) |
| `variants` | Variantes del ejercicio. La primera es la base (`factor` 1); `factor` = 1RM de la variante ÷ 1RM de la base |
| `stat` | Atributo RPG al que aporta (`STR`, `VIT`, `AGI`; se definen en `rpg.stats`) |
| `scoreWeight` | Peso del ejercicio en el score global (0-1) |
| `xpMultiplier` | Multiplicador de XP por punto de score |
| `standards.male/female` | Tabla 1RM por peso corporal (de "sin entrenar" a "clase mundial") |

Para agregar un ejercicio basta con añadir una entrada al JSON: la UI, el motor de rangos y el ranking global lo toman solos.
Si cambias la estructura o los estándares de forma incompatible, sube `version` (los clientes viejos serán rechazados con `catalog_mismatch`).

XP y nivel: `xp = Σ score × xpMultiplier × rpg.xp.perScorePoint`, `nivel = 1 + floor(√(xp / rpg.xp.levelDivisor))`.

## Variantes y grupos musculares

Cada ejercicio tiene variantes (p. ej. press banca: barra, inclinado, agarre cerrado, mancuernas). Al guardar una marca eliges la variante.

- Las tablas de estándares son del ejercicio base, así que cada marca se convierte a su **1RM equivalente** dividiendo entre el `factor` de la variante. Los factores son aproximaciones: ajústalos en `src/data/exercises.json`.
- Con mancuernas se registra el peso **por mancuerna** (el `note` de la variante lo recuerda).
- El rango, el score y el XP usan el mejor equivalente de todas las variantes del ejercicio.
- El score de un grupo muscular es el promedio ponderado (`scoreWeight`) de sus ejercicios registrados.

## Ranking global (Firebase)

Usa **Firebase Authentication (anónimo)** + **Realtime Database** del proyecto `rankedgg-d64be`. No hay servidor propio: el navegador escribe directo en Firebase y la seguridad la dan las reglas de la base.

**Rankings disponibles:** general, por grupo muscular, por ejercicio y por variante de un ejercicio (pestaña Ranking).

**Registro y verificación**

1. Al pulsar **Participar** (pestaña Ranking o Perfil) se crea la sesión anónima y se consulta `users/{uid}` en la base.
2. Si no existe, se pide el **nombre completo** (nombre y al menos un apellido), se guarda en `users/{uid}` y se vuelve a leer para confirmar que quedó registrado.
3. En el ranking solo aparece el **nombre público** (`Carlos R.`). El nombre completo es privado: solo su dueño puede leerlo. Para mostrar el nombre completo cambia `PUBLIC_NAME_MODE` en `src/lib/global/names.ts`.
4. **Verificación en la base (reglas):** solo se puede publicar si existe `users/{uid}` con `status: "active"`, y el nombre publicado debe coincidir exactamente con el registrado. Sin registro, Firebase rechaza la escritura.

**Estructura de datos** (todos los rankings indexados por `score`):

| Ruta | Contenido |
| --- | --- |
| `users/{uid}` | Registro: nombre completo, nombre público, estado (privado) |
| `players/{uid}` | Ranking general |
| `muscles/{músculo}/{uid}` | Ranking por grupo muscular |
| `lifts/{ejercicio}/{uid}` | Ranking por ejercicio (1RM equivalente) |
| `variants/{ejercicio}/{variante}/{uid}` | Ranking por variante (1RM real de la variante) |

El peso corporal y el sexo **no se guardan**: el score se calcula en el dispositivo. Solo el dueño (`auth.uid`) puede escribir sus nodos; las reglas validan tipos, rangos (score 0-100) y un tope de 1RM por ejercicio y variante.

### Puesta en marcha (una sola vez, y tras cada cambio de catálogo)

1. **Authentication → Sign-in method → Anónimo → Habilitar.**
2. **Realtime Database**: debe existir (modo bloqueado está bien) en `https://rankedgg-d64be-default-rtdb.firebaseio.com`.
3. Publica las reglas con una de estas dos opciones:
   - Consola: *Realtime Database → Reglas* → pega el contenido de [`database.rules.json`](database.rules.json) → **Publicar**.
   - CLI: `npx firebase-tools login` y luego `npx firebase-tools deploy --only database`.
4. Si cambias `src/data/exercises.json` (ejercicios, variantes o músculos), ejecuta `npm run rules` y vuelve a publicar las reglas; sube `version` si el cambio no es compatible.
5. (Recomendado) En Google Cloud → *Credenciales*, restringe la API key a tus dominios (HTTP referrers).

La configuración web está en [`src/lib/firebase/app.ts`](src/lib/firebase/app.ts) (no es secreta) y se puede sobrescribir con variables `NEXT_PUBLIC_FIREBASE_*`.

### Límites conocidos

- **La cuenta vive en el dispositivo.** La sesión anónima está atada al navegador: si el usuario borra los datos del sitio o cambia de teléfono, pierde acceso a su registro y a su ficha (quedaría una ficha huérfana en el ranking). Para recuperarla entre dispositivos hay que añadir un método de inicio de sesión real (correo o Google) y vincular la cuenta anónima.
- **Los nombres no son únicos** y no hay filtro de groserías.
- Sin servidor no se puede recalcular el score del lado seguro: alguien con conocimientos podría escribir un score falso dentro de los topes de las reglas. Para un ranking competitivo serio, el siguiente paso es una Cloud Function que valide y escriba.
- La posición cuando estás fuera del top 50 descarga a quienes van delante de ti; es válido para miles de usuarios, no para cientos de miles.
