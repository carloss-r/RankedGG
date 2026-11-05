"use client";

import { useMemo, useState } from "react";
import type { NewExercise } from "../hooks/useGym";
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_LIST,
  GROUP_LABELS,
  GROUPS,
  searchExercises,
} from "../lib/exercises";
import type { Equipment, Exercise, ExerciseKind, MuscleGroup } from "../lib/types";
import { ErrorNote, Field, Glass, PrimaryButton, TextInput } from "./ui";

const MAX_RESULTS = 60;

const KIND_LABELS: Record<ExerciseKind, string> = {
  weight: "Con peso (kg × repeticiones)",
  bodyweight: "Peso corporal (repeticiones)",
  timed: "Por tiempo (minutos)",
};

const SELECT_CLASS =
  "h-14 w-full rounded-2xl border border-white/12 bg-[#11131a] px-4 text-[16px] text-white outline-none";

function chipClass(active: boolean) {
  return `h-9 shrink-0 rounded-full px-4 text-[13px] ${
    active ? "bg-white text-black" : "bg-white/8 text-white/75"
  }`;
}

function ExerciseRow({
  exercise,
  selected,
  onSelect,
}: {
  exercise: Exercise;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const scored = exercise.core || Boolean(exercise.ref);
  return (
    <button
      type="button"
      onClick={() => onSelect(exercise.id)}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left ${
        selected ? "bg-white text-black" : "bg-white/6 text-white"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-[15px] leading-5 font-medium">{exercise.name}</span>
        <span className={`block text-[12px] ${selected ? "text-black/60" : "text-white/45"}`}>
          {GROUP_LABELS[exercise.group]} · {EQUIPMENT_LABELS[exercise.equipment]}
          {exercise.custom ? " · Tuyo" : ""}
        </span>
      </span>
      {exercise.core ? (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            selected ? "bg-black/10" : "bg-white/12"
          }`}
        >
          Base
        </span>
      ) : !scored ? (
        <span className={`shrink-0 text-[11px] ${selected ? "text-black/50" : "text-white/35"}`}>
          Solo registro
        </span>
      ) : null}
    </button>
  );
}

export function ExercisePicker({
  exercises,
  selectedId,
  recentIds,
  onSelect,
  onCreate,
  onClose,
}: {
  exercises: Exercise[];
  selectedId: string;
  recentIds: string[];
  onSelect: (id: string) => void;
  onCreate: (input: NewExercise) => Promise<Exercise>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<MuscleGroup | "all">("all");
  const [equipment, setEquipment] = useState<Equipment | "all">("all");

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<MuscleGroup>("chest");
  const [newEquipment, setNewEquipment] = useState<Equipment>("machine");
  const [newKind, setNewKind] = useState<ExerciseKind>("weight");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const results = useMemo(
    () => searchExercises(exercises, query, group, equipment),
    [exercises, query, group, equipment],
  );
  const filtering = query.trim() !== "" || group !== "all" || equipment !== "all";
  const recents = useMemo(
    () =>
      recentIds
        .map((id) => exercises.find((exercise) => exercise.id === id))
        .filter((exercise): exercise is Exercise => Boolean(exercise)),
    [recentIds, exercises],
  );
  const shown = results.slice(0, MAX_RESULTS);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const created = await onCreate({
        name: newName,
        group: newGroup,
        equipment: newEquipment,
        kind: newKind,
      });
      onSelect(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el ejercicio.");
      setBusy(false);
    }
  }

  return (
    <Glass className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-semibold">Elegir ejercicio</h2>
        <button type="button" onClick={onClose} className="text-[14px] text-white/55">
          Cerrar
        </button>
      </div>

      {creating ? (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] leading-5 text-white/55">
            Crea un ejercicio que no esté en la lista (una máquina rara de tu gimnasio, por
            ejemplo). Se guarda en tu cuenta y queda registrado, pero no cuenta para el
            rango porque no tiene estándar mundial.
          </p>
          <Field label="Nombre">
            <TextInput
              value={newName}
              onChange={setNewName}
              placeholder="Ej. Press de pecho Technogym"
              maxLength={60}
              autoFocus
            />
          </Field>
          <Field label="Músculo">
            <select
              value={newGroup}
              onChange={(event) => setNewGroup(event.target.value as MuscleGroup)}
              className={SELECT_CLASS}
            >
              {GROUPS.map((id) => (
                <option key={id} value={id}>
                  {GROUP_LABELS[id]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Equipo">
            <select
              value={newEquipment}
              onChange={(event) => setNewEquipment(event.target.value as Equipment)}
              className={SELECT_CLASS}
            >
              {EQUIPMENT_LIST.map((id) => (
                <option key={id} value={id}>
                  {EQUIPMENT_LABELS[id]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cómo se mide">
            <select
              value={newKind}
              onChange={(event) => setNewKind(event.target.value as ExerciseKind)}
              className={SELECT_CLASS}
            >
              {(Object.keys(KIND_LABELS) as ExerciseKind[]).map((id) => (
                <option key={id} value={id}>
                  {KIND_LABELS[id]}
                </option>
              ))}
            </select>
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setError(null);
              }}
              className="h-14 flex-1 rounded-full border border-white/15 text-white/80"
            >
              Atrás
            </button>
            <div className="flex-[1.4]">
              <PrimaryButton onClick={create} disabled={busy || newName.trim().length < 2}>
                {busy ? "Creando…" : "Crear y usar"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : (
        <>
          <TextInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar: press, jalón, prensa, plancha…"
            autoComplete="off"
          />

          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            <button type="button" onClick={() => setGroup("all")} className={chipClass(group === "all")}>
              Todos
            </button>
            {GROUPS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setGroup(id)}
                className={chipClass(group === id)}
              >
                {GROUP_LABELS[id]}
              </button>
            ))}
          </div>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            <button
              type="button"
              onClick={() => setEquipment("all")}
              className={chipClass(equipment === "all")}
            >
              Todo el equipo
            </button>
            {EQUIPMENT_LIST.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setEquipment(id)}
                className={chipClass(equipment === id)}
              >
                {EQUIPMENT_LABELS[id]}
              </button>
            ))}
          </div>

          <div className="flex max-h-[52dvh] flex-col gap-2 overflow-y-auto pr-1">
            {!filtering && recents.length > 0 && (
              <>
                <p className="px-1 pt-1 text-[11px] tracking-[0.14em] text-white/45 uppercase">
                  Recientes
                </p>
                {recents.map((exercise) => (
                  <ExerciseRow
                    key={`recent-${exercise.id}`}
                    exercise={exercise}
                    selected={exercise.id === selectedId}
                    onSelect={onSelect}
                  />
                ))}
                <p className="px-1 pt-2 text-[11px] tracking-[0.14em] text-white/45 uppercase">
                  Todos los ejercicios
                </p>
              </>
            )}
            {shown.map((exercise) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                selected={exercise.id === selectedId}
                onSelect={onSelect}
              />
            ))}
            {results.length === 0 && (
              <p className="px-2 py-6 text-center text-[14px] text-white/55">
                No hay ejercicios con esa búsqueda.
              </p>
            )}
            {results.length > MAX_RESULTS && (
              <p className="px-2 py-3 text-center text-[13px] text-white/45">
                Mostrando {MAX_RESULTS} de {results.length}. Escribe o filtra para acotar.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setNewName(query.trim());
              setCreating(true);
            }}
            className="h-12 rounded-full border border-white/15 text-[14px] text-white/80"
          >
            ¿No está? Crear ejercicio
          </button>
        </>
      )}
    </Glass>
  );
}
