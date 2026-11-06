# RankedGG

App web para **ver el progreso de gimnasio** con rangos estilo RPG (de **Madera** a **Mr Olympia**) y comparación contra estándares mundiales de fuerza.

Pensada para el teléfono: interfaz liquid glass, 100% responsive y datos guardados **en el dispositivo** (IndexedDB). Lista para desplegar en Vercel.

## Qué hace

- Muestra tu rango actual (emblemas SVG propios para los 14 rangos, de Madera a Mr Olympia) y el avance al siguiente.
- Compara sentadilla, press banca, peso muerto, press militar, remo, dominadas, curl y tríceps con tablas globales por peso y sexo.
- **Cuentas locales** con PIN opcional y sesión que se mantiene abierta.
- **Marcas sencillas**: se anota la marca y ya; el historial se agrupa solo por día.
- **Catálogo de ~300 ejercicios** para cualquier gimnasio (barra, mancuernas, máquinas, poleas, Smith, kettlebell, peso corporal, halterofilia, strongman, cardio), con búsqueda y filtros por músculo y equipo. Si falta uno, se puede crear.
- Guarda todo en una base local del teléfono. No hay servidor.

## Rangos competitivos y tarjeta para compartir

- 14 rangos (Madera → Mr Olympia), cada uno con **3 divisiones** (III → I) y **0–99 puntos** por división. Se calculan por **ejercicio** a partir de tu mejor 1RM y de tu sexo y peso corporal, y el **rango general** pondera los ejercicios.
- En **Rangos** ves, por ejercicio, el **1RM exacto que pide cada rango** (kg) y cuál llevas.
- Desde **Bronce** (nivel 24) en un ejercicio o en el general se desbloquea **Compartir**: genera un **PNG** (historia 1080×1920 o post 1080×1350) con tu nombre y tu rango en grande, escudo con progreso, percentil y **marca de agua RankedGG** (esquina + patrón diagonal).
- Puedes **añadir una foto de tu galería**, arrastrarla y hacer zoom para encuadrarte. Todo se dibuja en el dispositivo con `canvas`; la foto no se sube a ningún sitio. Se comparte con el menú del sistema (Web Share) o se descarga.
- Las dominadas puntúan por **peso extra**: solo con peso corporal no suman rango.

## Cuentas y sesión

- Varias personas pueden usar el mismo teléfono; cada cuenta tiene su perfil, marcas y sesiones por separado.
- El PIN (4 a 6 números) es opcional. Se guarda con PBKDF2 + sal, nunca en claro. Tras 5 intentos fallidos se bloquea 30 s.
- La sesión de inicio queda abierta hasta cerrar sesión. Las cuentas con PIN vuelven a pedirlo tras 30 días sin usar la app.
- Todo es **local**: no hay recuperación de PIN ni sincronización entre dispositivos. Borrar los datos del navegador borra las cuentas.
- Si venías de la versión anterior (un solo perfil sin cuenta), tus datos se migran solos a una cuenta con el mismo nombre y sin PIN, y las marcas se agrupan por día en sesiones.

## Anotar marcas

Eliges el ejercicio, ajustas peso y repeticiones (con − / +, ya rellenados con tu última marca) y pulsas **Guardar marca**. No hay que iniciar ni terminar nada: por debajo las marcas se agrupan solas por día en el historial. Antes de guardar ves tu 1RM estimado, el rango que daría y si sería marca personal.

Cuando superas tu mejor marca de un ejercicio sale una **animación de marca personal** (kg anteriores → nuevos, +kg y, si toca, la subida de rango) con opción de compartirla.

## Ejercicios y rango

- Los **8 ejercicios base** tienen tabla propia de estándares y pesan en el rango (sentadilla 30 %, banca 25 %, peso muerto 30 %, militar 15 %, remo 10 %, dominadas 8 %, curl 6 %, tríceps 6 %).
- Los demás ejercicios que tienen un equivalente razonable se comparan con el estándar de su ejercicio base **multiplicado por un factor estimado** y pesan 3 % cada uno. Son aproximaciones, no una tabla oficial (ver `src/lib/exercises.ts`).
- Los que no tienen equivalencia (cardio, planchas, acarreos, ejercicios creados por ti) **solo se registran**: guardan historial y progreso, pero no cambian el rango.
- Mancuernas: se anota el peso **por mancuerna**. Máquinas y poleas: lo que marque la pila o los discos puestos.

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

> El PIN usa Web Crypto, que solo existe en contextos seguros (HTTPS o `localhost`). En Vercel funciona; si abres el servidor de desarrollo desde otro dispositivo por IP (`http://192.168...`), crear un PIN no estará disponible.
