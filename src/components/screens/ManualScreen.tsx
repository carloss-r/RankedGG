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
          <h2 className="mb-2 text-[18px] font-semibold">Cómo registrar marcas</h2>
          <p className="text-[14px] leading-6 text-white/70">
            Ve a la pestaña "Marcas", selecciona el ejercicio, ingresa el peso en kg
            y las repeticiones. La app calcula automáticamente tu 1RM estimado
            usando la fórmula Epley. Solo se guarda tu mejor marca por ejercicio.
          </p>
        </Glass>

        <Glass className="px-4 py-4">
          <h2 className="mb-2 text-[18px] font-semibold">Tus datos</h2>
          <p className="text-[14px] leading-6 text-white/70">
            Toda la información se guarda localmente en tu dispositivo usando
            IndexedDB. No hay servidor ni cuenta. Tus datos son privados y solo
            tú tienes acceso. Puedes borrar todo desde la pestaña "Yo".
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
