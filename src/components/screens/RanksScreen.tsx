"use client";

import { useMemo, useState } from "react";
import { ceilToHalf, formatKg, levelsFor, rankLadder } from "../../lib/engine";
import { shortName } from "../../lib/exercises";
import { RANKS, SHARE_MIN_SCORE } from "../../lib/ranks";
import type { Exercise, LiftId, Profile, RankSnapshot } from "../../lib/types";
import { RankBadge } from "../RankBadge";
import { RankRoad } from "../RankRoad";
import { Glass } from "../ui";

export function RanksScreen({
  snapshot,
  profile,
  getExercise,
  onShare,
}: {
  snapshot: RankSnapshot;
  profile: Profile;
  getExercise: (id: LiftId) => Exercise | undefined;
  onShare: (lift?: LiftId) => void;
}) {
  const [selected, setSelected] = useState<LiftId>(snapshot.lifts[0]?.lift ?? "squat");
  const lift = snapshot.lifts.find((item) => item.lift === selected) ?? snapshot.lifts[0];
  const standing = lift?.standing;

  const ladder = useMemo(() => {
    if (!lift) return [];
    const levels = levelsFor(profile.sex, lift.lift, getExercise(lift.lift), profile.bodyweightKg);
    return levels ? rankLadder(levels) : [];
  }, [lift, profile.sex, profile.bodyweightKg, getExercise]);

  const general = snapshot.standing;
  const canShareGeneral = snapshot.score >= SHARE_MIN_SCORE;
  const canShareLift = !!lift && lift.oneRm > 0 && lift.score >= SHARE_MIN_SCORE;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] tracking-[0.18em] text-white/45 uppercase">Competitivo</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Rangos</h1>
        <p className="mt-2 text-[15px] leading-6 text-white/60">
          Tu rango sale de tu mejor 1RM en cada ejercicio, comparado con estándares mundiales
          para tu sexo y peso corporal. Cada rango tiene tres divisiones (III → I).
        </p>
      </header>

      <Glass className="relative overflow-hidden px-5 py-5">
        <div
          className="pointer-events-none absolute -top-12 -right-8 h-36 w-36 rounded-full opacity-70 blur-2xl"
          style={{ background: general.rank.glow }}
        />
        <p className="text-[12px] tracking-[0.16em] text-white/45 uppercase">Rango general</p>
        <div className="mt-2 flex items-center gap-3">
          <RankBadge rankId={general.rank.id} size={72} glow={general.rank.glow} className="rg-float" />
          <div>
            <p className="text-[28px] leading-none font-semibold" style={{ color: general.rank.color }}>
              {general.label}
            </p>
            <p className="mt-1 text-[13px] text-white/55">
              {general.points} pts · nivel {Math.round(snapshot.score)}/100
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onShare()}
          className="mt-4 h-12 w-full rounded-full bg-white text-[15px] font-semibold text-black"
        >
          {canShareGeneral ? "Compartir mi rango" : "🔒 Compartir (desde Bronce)"}
        </button>
      </Glass>

      <section className="flex flex-col gap-1">
        <h2 className="px-1 text-[12px] tracking-[0.16em] text-white/45 uppercase">
          Camino de rangos · desde Madera
        </h2>
        <RankRoad currentId={general.rank.id} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-[12px] tracking-[0.16em] text-white/45 uppercase">
          Rango por ejercicio
        </h2>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {snapshot.lifts.map((item) => (
            <button
              key={item.lift}
              type="button"
              aria-pressed={item.lift === lift?.lift}
              onClick={() => setSelected(item.lift)}
              className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium ${
                item.lift === lift?.lift ? "bg-white text-black" : "glass text-white/80"
              }`}
            >
              {shortName(item.lift, getExercise(item.lift))}
            </button>
          ))}
        </div>

        {lift && standing && (
          <Glass className="px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] text-white/50">
                  {shortName(lift.lift, getExercise(lift.lift))} ·{" "}
                  {lift.oneRm > 0 ? `1RM ${formatKg(lift.oneRm)}` : "sin marca"}
                </p>
                <p className="mt-1 text-[26px] leading-none font-semibold" style={{ color: standing.rank.color }}>
                  {lift.oneRm > 0 ? standing.label : "Sin rango"}
                </p>
                {lift.oneRm > 0 && (
                  <p className="mt-1 text-[13px] text-white/55">
                    {standing.points} pts
                    {standing.nextRank ? ` · siguiente: ${standing.nextRank.name}` : ""}
                  </p>
                )}
              </div>
              <RankBadge
                rankId={standing.rank.id}
                size={64}
                locked={lift.oneRm <= 0}
                glow={lift.oneRm > 0 ? standing.rank.glow : undefined}
              />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(3, Math.round(standing.progress * 100))}%`,
                  background: standing.rank.color,
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => onShare(lift.lift)}
              className="mt-4 h-11 w-full rounded-full bg-white/90 text-[14px] font-semibold text-black"
            >
              {canShareLift ? "Compartir esta marca" : "🔒 Compartir (desde Bronce)"}
            </button>
          </Glass>
        )}

        <div className="flex flex-col gap-2">
          {ladder.map(({ rank, kg }) => {
            const reached = !!lift && lift.oneRm > 0 && lift.oneRm >= kg - 1e-6 && lift.score >= rank.minScore - 1e-6;
            const current = !!standing && lift?.oneRm ? standing.rank.id === rank.id : false;
            return (
              <Glass
                key={rank.id}
                className={`px-4 py-3 ${current ? "ring-2 ring-white/70" : ""}`}
                style={{ opacity: reached ? 1 : 0.55 }}
              >
                <div className="flex items-center gap-3">
                  <RankBadge rankId={rank.id} size={46} locked={!reached} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold">{rank.name}</p>
                    <p className="truncate text-[12px] text-white/50">{rank.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[15px] font-semibold">
                      {kg > 0 ? formatKg(ceilToHalf(kg)) : rank.minScore === 0 ? "Inicio" : "Peso corporal"}
                    </p>
                    <p className="text-[11px] text-white/45">
                      {current ? "Actual" : reached ? "Superado" : "1RM"}
                    </p>
                  </div>
                </div>
              </Glass>
            );
          })}
          {ladder.length === 0 && (
            <p className="px-1 text-[14px] text-white/55">
              Este ejercicio solo se registra: no tiene tabla de rangos.
            </p>
          )}
        </div>
      </section>

      <p className="px-1 text-[12px] leading-5 text-white/40">
        {RANKS.length} rangos · el general pondera tus ejercicios base (sentadilla, banca, peso
        muerto…) y suma los demás que registres.
      </p>
    </div>
  );
}
