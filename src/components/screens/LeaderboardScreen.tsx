"use client";

import { useEffect, useState } from "react";
import { formatKg } from "../../lib/engine";
import { fetchLeaderboard, GlobalError, type GlobalIdentity } from "../../lib/global/client";
import type { LeaderboardEntry, LeaderboardResponse } from "../../lib/global/types";
import { rankById } from "../../lib/ranks";
import { LIFT_META, LIFTS } from "../../lib/standards";
import type { LiftId } from "../../lib/types";
import type { GlobalSync } from "../../hooks/useGym";
import { Glass, PrimaryButton } from "../ui";

type Scope = "overall" | LiftId;

type Result = { key: string; data?: LeaderboardResponse; error?: string };

export function errorMessage(code?: string) {
  switch (code) {
    case "backend_not_configured":
      return "El ranking global aún no está activado en este servidor.";
    case "implausible_mark":
      return "Una de tus marcas parece fuera de rango para tu peso. Revísala.";
    case "catalog_mismatch":
      return "Actualiza la app para seguir sincronizando.";
    case "rate_limited":
      return "Demasiados envíos seguidos. Intenta en un minuto.";
    case "network":
      return "Sin conexión. Se reintentará cuando cambies una marca.";
    default:
      return "No se pudo conectar con el ranking.";
  }
}

export function LeaderboardScreen({
  identity,
  shareGlobally,
  sync,
  hasMarks,
  onEnable,
}: {
  identity: GlobalIdentity | null;
  shareGlobally: boolean;
  sync: GlobalSync;
  hasMarks: boolean;
  onEnable: () => Promise<void>;
}) {
  const [scope, setScope] = useState<Scope>("overall");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const playerId = shareGlobally ? identity?.playerId : undefined;
  // Se vuelve a pedir cuando cambia el ejercicio o cuando se sincroniza un nuevo score.
  const key = `${scope}|${playerId ?? ""}|${sync.me?.score ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard({ lift: scope === "overall" ? undefined : scope, playerId, limit: 50 })
      .then((data) => {
        if (!cancelled) setResult({ key, data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResult({ key, error: err instanceof GlobalError ? err.code : "network" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key, scope, playerId]);

  const loading = result?.key !== key;
  const data = result?.data;
  const entries = data?.entries ?? [];
  const me = data?.me ?? null;
  const meVisible = me ? entries.some((entry) => entry.id === me.id) : false;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] tracking-[0.18em] text-white/45 uppercase">Global</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Ranking</h1>
        <p className="mt-2 text-[15px] leading-6 text-white/60">
          Todos los atletas de RankedGG, ordenados por score. Se compara por peso y sexo,
          así que cualquiera puede llegar arriba.
        </p>
      </header>

      {!shareGlobally && (
        <Glass className="px-5 py-5">
          <p className="text-[17px] font-semibold">Únete al ranking</p>
          <p className="mt-1 text-[14px] leading-5 text-white/65">
            Se comparte tu nombre, rango y mejores marcas. Tu peso corporal no se muestra
            a otros.
          </p>
          <div className="mt-4">
            <PrimaryButton
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onEnable();
                setBusy(false);
              }}
            >
              Participar
            </PrimaryButton>
          </div>
        </Glass>
      )}

      {shareGlobally && !hasMarks && (
        <Glass className="px-5 py-4 text-[14px] text-white/70">
          Registra al menos una marca para aparecer en el ranking.
        </Glass>
      )}

      {shareGlobally && sync.status === "error" && (
        <Glass className="px-5 py-4 text-[14px] text-rose-200">
          {errorMessage(sync.error)}
          {sync.detail ? ` (${sync.detail})` : ""}
        </Glass>
      )}

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {(["overall", ...LIFTS] as Scope[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setScope(id)}
            className={`h-10 shrink-0 rounded-full px-4 text-[14px] ${
              scope === id ? "bg-white text-black" : "glass text-white/80"
            }`}
          >
            {id === "overall" ? "General" : LIFT_META[id].short}
          </button>
        ))}
      </div>

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
            <Row key={entry.id} entry={entry} mine={entry.id === me?.id} scope={scope} />
          ))}
          {me && !meVisible && (
            <>
              <p className="px-2 text-center text-[12px] tracking-[0.16em] text-white/40 uppercase">
                Tu posición
              </p>
              <Row entry={me} mine scope={scope} />
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
  scope,
}: {
  entry: LeaderboardEntry;
  mine: boolean;
  scope: Scope;
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
          {scope === "overall" ? entry.score.toFixed(1) : formatKg(entry.oneRm ?? 0)}
        </p>
        <p className="text-[11px] text-white/45">
          {scope === "overall" ? "score" : `score ${entry.score.toFixed(0)}`}
        </p>
      </div>
    </Glass>
  );
}
