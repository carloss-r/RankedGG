"use client";

import { Glass } from "../ui";

export function ManualScreen() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] tracking-[0.18em] text-white/45 uppercase">Ayuda</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Manual</h1>
      </header>

      <div className="flex flex-col gap-4">
        <Glass className="px-4 py-4">
          <h2 className="mb-2 text-[18px] font-semibold">¿Cómo funciona?</h2>
          <p className="text-[14px] leading-6 text-white/70">
            RankedGG compara tus marcas personales con estándares globales de fuerza
            basados en tu peso corporal y sexo. Tu rango se calcula automáticamente
            usando tus mejores marcas en cada ejercicio.
          </p>
        </Glass>

        <Glass className="px-4 py-4">
          <h2 className="mb-2 text-[18px] font-semibold">Sistema de rangos</h2>
          <p className="mb-3 text-[14px] leading-6 text-white/70">
            Avanza desde Madera hasta Mr Olympia. Cada rango representa un nivel de
            fuerza comparado con la población mundial:
          </p>
          <ul className="space-y-1 text-[13px] text-white/60">
            <li>• <span className="text-white/80">Madera</span> - Primeros pasos</li>
            <li>• <span className="text-white/80">Piedra/Hierro</span> - Consistencia básica</li>
            <li>• <span className="text-white/80">Bronce/Plata/Oro</span> - Nivel gimnasio sólido</li>
            <li>• <span className="text-white/80">Platino/Zafiro/Esmeralda</span> - Avanzado</li>
            <li>• <span className="text-white/80">Diamante/Maestro</span> - Élite local</li>
            <li>• <span className="text-white/80">Campeón/Titán</span> - Competitivo</li>
            <li>• <span className="text-white/80">Mr Olympia</span> - Cima absoluta</li>
          </ul>
          <p className="mt-3 text-[13px] leading-5 text-white/60">
            Cada rango tiene 3 divisiones (III → I) y 0–99 puntos dentro de cada una. En la
            pestaña Rangos ves el 1RM que pide cada rango en cada ejercicio, según tu sexo y
            peso corporal.
          </p>
        </Glass>

        <Glass className="px-4 py-4">
          <h2 className="mb-2 text-[18px] font-semibold">Compartir tu rango</h2>
          <p className="text-[14px] leading-6 text-white/70">
            En cualquier rango, desde Madera, y en cualquier ejercicio con marca (o en tu rango general), puedes crear una
            imagen PNG con tu nombre, tu rango en grande y la marca de agua de RankedGG.
            Añade una foto de tu galería y encuádrala con el dedo: arrastra para moverla y pellizca para hacer zoom. Los datos también se arrastran. Con la barra de abajo eliges la tipografía, qué datos mostrar y dónde ponerlos, y la compartes o la guardas. La foto se
            procesa en tu dispositivo y no se sube a ningún servidor.
          </p>
        </Glass>

        <Glass className="px-4 py-4">
          <h2 className="mb-2 text-[18px] font-semibold">Ejercicios principales</h2>
          <p className="mb-3 text-[14px] leading-6 text-white/70">
            Los 4 ejercicios principales tienen mayor peso en tu rango:
          </p>
          <ul className="space-y-1 text-[13px] text-white/60">
            <li>• <span className="text-white/80">Sentadilla (30%)</span> - Piernas completas</li>
            <li>• <span className="text-white/80">Press banca (25%)</span> - Pecho y tríceps</li>
            <li>• <span className="text-white/80">Peso muerto (30%)</span> - Cadena posterior</li>
            <li>• <span className="text-white/80">Press militar (15%)</span> - Hombros</li>
          </ul>
        </Glass>

        <Glass className="px-4 py-4">
          <h2 className="mb-2 text-[18px] font-semibold">Ejercicios adicionales</h2>
          <p className="mb-3 text-[14px] leading-6 text-white/70">
            Ejercicios complementarios con menor peso en el cálculo:
          </p>
          <ul className="space-y-1 text-[13px] text-white/60">
            <li>• <span className="text-white/80">Remo con barra (10%)</span> - Espalda</li>
            <li>• <span className="text-white/80">Dominadas (8%)</span> - Espalda/bíceps</li>
            <li>• <span className="text-white/80">Curl con barra (6%)</span> - Bíceps</li>
            <li>• <span className="text-white/80">Extensiones tríceps (6%)</span> - Tríceps</li>
          </ul>
        </Glass>

        <Glass className="px-4 py-4">
          <h2 className="mb-2 text-[18px] font-semibold">Catálogo para cualquier gimnasio</h2>
          <p className="text-[14px] leading-6 text-white/70">
            Además de los 8 ejercicios base hay cerca de 300 en el catálogo: barra,
            mancuernas, máquinas, poleas, Smith, kettlebell, peso corporal, halterofilia,
            strongman y cardio. Búscalos por nombre o filtra por músculo y equipo. Si
            falta uno (una máquina rara de tu gym), créalo desde el selector.
          </p>
          <ul className="mt-3 space-y-1 text-[13px] text-white/60">
            <li>
              • <span className="text-white/80">Cuentan para el rango</span> los que tienen un
              ejercicio base equivalente: se comparan con ese estándar multiplicado por un
              factor estimado, y cada uno pesa 3%. Son aproximaciones, no una tabla oficial.
            </li>
            <li>
              • <span className="text-white/80">Solo registro</span> (cardio, planchas,
              acarreos, los que creas tú…): guardan tu historial y progreso, pero no
              cambian tu rango.
            </li>
            <li>
              • En mancuernas anota el peso <span className="text-white/80">por mancuerna</span>;
              en máquinas y poleas, lo que marque la pila o los discos puestos.
            </li>
          </ul>
        </Glass>

        <Glass className="px-4 py-4">
          <h2 className="mb-2 text-[18px] font-semibold">Cómo registrar marcas</h2>
          <p className="text-[14px] leading-6 text-white/70">
            Ve a la pestaña "Marcas", elige el ejercicio, ingresa el peso en kg y las
            repeticiones (o los minutos en cardio). La app calcula tu 1RM estimado con la
            fórmula de Epley, y para el rango y el progreso usa tu mejor marca de cada
            ejercicio. Todas tus marcas quedan guardadas en el historial.
          </p>
        </Glass>

        <Glass className="px-4 py-4">
          <h2 className="mb-2 text-[18px] font-semibold">Marcas personales</h2>
          <p className="text-[14px] leading-6 text-white/70">
            No hay que iniciar ni terminar nada: solo anota la marca y guarda. Si superas tu
            mejor 1RM de ese ejercicio verás una animación con tus kg nuevos y, si subes de
            rango, también la subida. Tu historial se agrupa solo por día.
          </p>
        </Glass>

        <Glass className="px-4 py-4">
          <h2 className="mb-2 text-[18px] font-semibold">Cuentas y PIN</h2>
          <p className="text-[14px] leading-6 text-white/70">
            Varias personas pueden usar la app en el mismo teléfono: cada cuenta tiene su
            perfil, sus marcas y sus sesiones por separado. Tu sesión se mantiene abierta
            hasta que cierres sesión. Si pones un PIN, se pide al entrar y tras 30 días sin
            usar la app. Si lo olvidas no hay forma de recuperarlo, porque no hay servidor.
          </p>
        </Glass>

        <Glass className="px-4 py-4">
          <h2 className="mb-2 text-[18px] font-semibold">Tus datos</h2>
          <p className="text-[14px] leading-6 text-white/70">
            Toda la información se guarda localmente en tu dispositivo usando
            IndexedDB. Las cuentas y el PIN son locales: no hay servidor ni
            sincronización entre dispositivos, así que tus datos son privados. Borrar los
            datos del navegador o desinstalar la app también los elimina. Puedes borrar
            tu cuenta desde la pestaña "Yo".
          </p>
        </Glass>

        <Glass className="px-4 py-4">
          <h2 className="mb-2 text-[18px] font-semibold">Consejos</h2>
          <ul className="space-y-1 text-[13px] text-white/60">
            <li>• Registra tus marcas reales, no estimaciones</li>
            <li>• El progreso toma tiempo, sé constante</li>
            <li>• Usa buena técnica antes de aumentar peso</li>
            <li>• Compara tu progreso contigo mismo, no con otros</li>
          </ul>
        </Glass>
      </div>
    </div>
  );
}
