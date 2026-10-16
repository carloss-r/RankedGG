"use client";

import { useEffect, useState } from "react";
import { EXERCISES, MUSCLE_IDS, MUSCLES, variantsOf } from "../../lib/catalog";
import { formatKg } from "../../lib/engine";
import { fetchLeaderboard, scopeKey } from "../../lib/firebase/leaderboard";
import { toGlobalError } from "../../lib/global/errors";
import { errorMessage } from "../../lib/global/messages";
import type { LeaderboardEntry, LeaderboardResponse, Scope } from "../../lib/global/types";
import { rankById } from "../../lib/ranks";
import type { GlobalSync } from "../../hooks/useGym";
import { Glass, PrimaryButton } from "../ui";

type Mode = "overall" | "muscle" | "lift";

type Result = { key: string; data?: LeaderboardResponse; error?: string };

function Chips<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`h-10 shrink-0 rounded-full px-4 text-[14px] ${
            value === item.id ? "bg-white text-black" : "glass text-white/80"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function LeaderboardScreen({
  playerId: knownPlayerId,
  shareGlobally,
  sync,
  hasMarks,
  onJoin,
}: {
  playerId: string | null;
  shareGlobally: boolean;
  sync: GlobalSync;
  hasMarks: boolean;
  onJoin: () => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>("overall");
  const [muscle, setMuscle] = useState(MUSCLE_IDS[0]);
  const [lift, setLift] = useState(EXERCISES[0].id);
  const [variant, setVariant] = useState("all");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const scope: Scope =
    mode === "overall"
      ? { kind: "overall" }
      : mode === "muscle"
        ? { kind: "muscle", id: muscle }
        : { kind: "lift", id: lift, variant: variant === "all" ? undefined : variant };

  const playerId = shareGlobally ? knownPlayerId : null;
  // Se vuelve a pedir cuando cambia el ámbito o cuando se sincroniza un nuevo score.
  const key = `${scopeKey(scope)}|${playerId ?? ""}|${sync.me?.score ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard({ scope, playerId, limit: 50 })
      .then((data) => {
        if (!cancelled) setResult({ key, data });
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ key, error: toGlobalError(err).code });
      });
    return () => {
      cancelled = true;
    };
    // `scope` se deriva de mode/muscle/lift/variant, ya cubiertos por `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, playerId]);

  const loading = result?.key !== key;
  const data = result?.data;
  const entries = data?.entries ?? [];
  const me = data?.me ?? null;
  const meVisible = me ? entries.some((entry) => entry.id === me.id) : false;
  const showKg = scope.kind === "lift";

  async function join() {
    setBusy(true);
    await onJoin();
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] tracking-[0.18em] text-white/45 uppercase">Global</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Ranking</h1>
        <p className="mt-2 text-[15px] leading-6 text-white/60">
          Todos los atletas de RankedGG. Filtra por general, grupo muscular o ejercicio (y su
          variante). Se compara por peso y sexo, así que cualquiera puede llegar arriba.
        </p>
      </header>

      {!shareGlobally && (
        <Glass className="px-5 py-5">
          <p className="text-[17px] font-semibold">Únete al ranking</p>
          <p className="mt-1 text-[14px] leading-5 text-white/65">
            Te pediremos tu nombre completo para registrarte. En el ranking se muestra solo
            tu nombre corto, rango y marcas; tu peso corporal no se comparte.
          </p>
          <div className="mt-4">
            <PrimaryButton disabled={busy} onClick={join}>
              Participar
            </PrimaryButton>
          </div>
        </Glass>
      )}

      {shareGlobally && sync.error === "not_registered" && (
        <Glass className="px-5 py-5">
          <p className="text-[14px] leading-5 text-rose-200">{errorMessage(sync.error)}</p>
          <div className="mt-4">
            <PrimaryButton disabled={busy} onClick={join}>
              Registrarme de nuevo
            </PrimaryButton>
          </div>
        </Glass>
      )}

      {shareGlobally && !hasMarks && (
        <Glass className="px-5 py-4 text-[14px] text-white/70">
          Registra al menos una marca para aparecer en el ranking.
        </Glass>
      )}

      {shareGlobally && sync.status === "error" && sync.error !== "not_registered" && (
        <Glass className="px-5 py-4 text-[14px] text-rose-200">
          {errorMessage(sync.error)}
          {sync.detail ? ` (${sync.detail})` : ""}
        </Glass>
      )}

      <Chips
        value={mode}
        onChange={setMode}
        items={[
          { id: "overall", label: "General" },
          { id: "muscle", label: "Por músculo" },
          { id: "lift", label: "Por ejercicio" },
        ]}
      />

      {mode === "muscle" && (
        <Chips
          value={muscle}
          onChange={setMuscle}
          items={MUSCLE_IDS.map((id) => ({ id, label: MUSCLES[id].name }))}
        />
      )}

      {mode === "lift" && (
        <>
          <Chips
            value={lift}
            onChange={(id) => {
              setLift(id);
              setVariant("all");
            }}
            items={EXERCISES.map((exercise) => ({ id: exercise.id, label: exercise.short }))}
          />
          <Chips
            value={variant}
            onChange={setVariant}
            items={[
              { id: "all", label: "Todas" },
              ...variantsOf(lift).map((item) => ({ id: item.id, label: item.name })),
            ]}
          />
        </>
      )}

      {loading && <Glass className="px-5 py-8 text-center text-white/55">Cargando…</Glass>}

      {!loading && result?.error && (
        <Glass className="px-5 py-8 text-center text-[15px] text-white/60">
          {errorMessage(result.error)}
        </Glass>
      )}

      {!loading && data && entries.length === 0 && (
        <Glass className="px-5 py-8 text-center text-[15px] text-white/55">
          Aún no hay atletas aquí. Sé el primero.
        </Glass>
      )}

      {!loading && data && (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <Row key={entry.id} entry={entry} mine={entry.id === me?.id} showKg={showKg} />
          ))}
          {me && !meVisible && (
            <>
              <p className="px-2 text-center text-[12px] tracking-[0.16em] text-white/40 uppercase">
                Tu posición
              </p>
              <Row entry={me} mine showKg={showKg} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  entry,
  mine,
  showKg,
}: {
  entry: LeaderboardEntry;
  mine: boolean;
  showKg: boolean;
}) {
  const rank = rankById(entry.rankId);
  const podium = entry.position <= 3;
  return (
    <Glass className={`flex items-center gap-3 px-4 py-3 ${mine ? "ring-2 ring-white/70" : ""}`}>
      <span
        className="w-8 text-center text-[17px] font-semibold"
        style={{ color: podium ? rank.color : "rgba(255,255,255,0.5)" }}
      >
        {entry.position}
      </span>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[18px]"
        style={{ background: rank.glow }}
      >
        {rank.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-medium">
          {entry.name}
          {mine && <span className="ml-2 text-[12px] text-white/50">tú</span>}
        </p>
        <p className="text-[12px] text-white/50">
          {rank.name} · Nv. {entry.level}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[17px] font-semibold">
          {showKg ? formatKg(entry.oneRm ?? 0) : entry.score.toFixed(1)}
        </p>
        <p className="text-[11px] text-white/45">
          {showKg ? `score ${entry.score.toFixed(0)}` : "score"}
        </p>
      </div>
    </Glass>
  );
}

