"use client";

import { useEffect, useState } from "react";
import { formatKg, formatPercent } from "../../lib/engine";
import { RPG } from "../../lib/catalog";
import { getRandomQuote } from "../../lib/quotes";
import type { RpgSheet } from "../../lib/rpg";
import { LIFT_META } from "../../lib/standards";
import type { Profile, RankSnapshot } from "../../lib/types";
import { Glass } from "../ui";

export function HomeScreen({
  profile,
  snapshot,
  rpg,
}: {
  profile: Profile;
  snapshot: RankSnapshot;
  rpg: RpgSheet | null;
}) {
  const [quote, setQuote] = useState(getRandomQuote());

  useEffect(() => {
    const interval = setInterval(() => {
      setQuote(getRandomQuote());
    }, 30000); // Cambiar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const hour = new Date().getHours();
  const hello = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const logged = snapshot.lifts.filter((lift) => lift.oneRm > 0);
  const weakest = [...logged].sort((a, b) => a.score - b.score)[0];
  const nextNeed =
    snapshot.nextRank && weakest?.nextKg
      ? `Para ${snapshot.nextRank.name}, acerca ${LIFT_META[weakest.lift].short.toLowerCase()} a ${formatKg(weakest.nextKg)}.`
      : snapshot.nextRank
        ? `Sigue subiendo marcas para alcanzar ${snapshot.nextRank.name}.`
        : "Estás en la cima del ranking.";

  const size = 168;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - snapshot.progressToNext);

  return (
    <div className="flex flex-col gap-5">
      <header className="px-1">
        <p className="text-[13px] tracking-[0.18em] text-white/45 uppercase">{hello}</p>
        <h1 className="mt-1 text-[32px] leading-tight font-semibold tracking-tight">
          {profile.name}
        </h1>
      </header>

      <Glass className="px-4 py-3">
        <p className="text-[14px] leading-5 text-center text-white/80 italic">"{quote}"</p>
      </Glass>

      <Glass className="relative overflow-hidden px-5 pt-6 pb-5">
        <div
          className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full opacity-70 blur-2xl"
          style={{ background: snapshot.rank.glow }}
        />
        <div className="flex items-center gap-4">
          <div className="relative shrink-0" style={{ width: size * 0.72, height: size * 0.72 }}>
            <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={stroke}
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={snapshot.rank.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[28px] leading-none">{snapshot.rank.icon}</span>
            </div>
          </div>
          <div>
            <p className="text-[13px] text-white/50">Rango actual</p>
            <h2 className="text-[34px] leading-none font-semibold tracking-tight">
              {snapshot.rank.name}
            </h2>
            <p className="mt-2 text-[14px] text-white/60">{snapshot.rank.subtitle}</p>
          </div>
        </div>
        <div className="mt-5 flex items-end justify-between">
          <p className="max-w-[70%] text-[14px] leading-5 text-white/70">{nextNeed}</p>
          <p className="text-right text-[13px] text-white/50">
            {Math.round(snapshot.progressToNext * 100)}%
            <br />
            al siguiente
          </p>
        </div>
      </Glass>

      {rpg && (
        <Glass className="px-5 py-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[12px] tracking-[0.16em] text-white/45 uppercase">Nivel</p>
              <p className="text-[34px] leading-none font-semibold">{rpg.level}</p>
            </div>
            <p className="text-[13px] text-white/50">{rpg.xp} XP</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(rpg.levelProgress * 100)}%`,
                background: snapshot.rank.color,
              }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {Object.entries(RPG.stats).map(([id, stat]) => (
              <div key={id}>
                <p className="text-[11px] tracking-[0.14em] text-white/45 uppercase">{id}</p>
                <p className="text-[20px] font-semibold">{rpg.stats[id] ?? 0}</p>
                <p className="text-[11px] text-white/45">{stat.name}</p>
              </div>
            ))}
          </div>
        </Glass>
      )}

      <Glass className="px-5 py-5">
        <p className="text-[12px] tracking-[0.16em] text-white/45 uppercase">
          Comparación mundial
        </p>
        <p className="mt-2 text-[28px] font-semibold tracking-tight">
          Top {formatPercent(100 - snapshot.percentile)}%
        </p>
        <p className="mt-1 text-[14px] leading-5 text-white/62">
          Más fuerte que el {formatPercent(snapshot.percentile)}% de practicantes de tu
          peso y sexo, según estándares globales de 1RM.
        </p>
      </Glass>

      <div className="grid grid-cols-2 gap-3">
        {snapshot.lifts.map((lift) => (
          <Glass key={lift.lift} className="px-4 py-4 text-left">
            <p className="text-[12px] text-white/45">{LIFT_META[lift.lift].short}</p>
            <p className="mt-1 text-[22px] font-semibold">{formatKg(lift.oneRm)}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(4, Math.min(100, lift.score))}%`,
                  background: snapshot.rank.color,
                }}
              />
            </div>
            <p className="mt-2 text-[12px] text-white/50">{lift.levelLabel}</p>
          </Glass>
        ))}
      </div>
    </div>
  );
}
