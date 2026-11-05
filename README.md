# RankedGG

App web para **ver el progreso de gimnasio** con rangos estilo RPG (de **Madera** a **Mr Olympia**) y comparación contra estándares mundiales de fuerza.

Pensada para el teléfono: interfaz liquid glass, 100% responsive y datos guardados **en el dispositivo** (IndexedDB). Lista para desplegar en Vercel.

## Qué hace

- Muestra tu rango actual y el avance al siguiente.
- Compara sentadilla, press banca, peso muerto, press militar, remo, dominadas, curl y tríceps con tablas globales por peso y sexo.
- **Cuentas locales** con PIN opcional y sesión que se mantiene abierta.
- **Sesiones de entrenamiento**: las series de un mismo día se agrupan, en orden.
- **Catálogo de ~300 ejercicios** para cualquier gimnasio (barra, mancuernas, máquinas, poleas, Smith, kettlebell, peso corporal, halterofilia, strongman, cardio), con búsqueda y filtros por músculo y equipo. Si falta uno, se puede crear.
- Guarda todo en una base local del teléfono. No hay servidor.

## Cuentas y sesión

- Varias personas pueden usar el mismo teléfono; cada cuenta tiene su perfil, marcas y sesiones por separado.
- El PIN (4 a 6 números) es opcional. Se guarda con PBKDF2 + sal, nunca en claro. Tras 5 intentos fallidos se bloquea 30 s.
- La sesión de inicio queda abierta hasta cerrar sesión. Las cuentas con PIN vuelven a pedirlo tras 30 días sin usar la app.
- Todo es **local**: no hay recuperación de PIN ni sincronización entre dispositivos. Borrar los datos del navegador borra las cuentas.
- Si venías de la versión anterior (un solo perfil sin cuenta), tus datos se migran solos a una cuenta con el mismo nombre y sin PIN, y las marcas se agrupan por día en sesiones.

## Sesiones de entrenamiento

Al guardar la primera serie se abre una sesión y las siguientes se agrupan en ella. Se termina con **Terminar**; si queda abierta más de 6 horas sin series, se cierra sola y la siguiente serie abre una nueva.

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
