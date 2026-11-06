"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { formatKg } from "../lib/engine";
import { SHARE_MIN_SCORE } from "../lib/ranks";
import type { RecordEvent } from "../lib/types";
import { RankBadge } from "./RankBadge";

const CONFETTI = 44;
const COLORS = ["#ffd23f", "#ffffff", "#fb7185", "#7dd3fc", "#34d399", "#c4b5fd", "#fb923c"];

function confettiStyle(index: number, accent: string): CSSProperties {
  // Determinista (sin Math.random durante el render): reparte por índice.
  const left = (index * 37 + 11) % 100;
  const size = 7 + ((index * 5) % 8);
  const drift = ((index * 53) % 160) - 80;
  const color = index % 4 === 0 ? accent : COLORS[index % COLORS.length];
  return {
    left: `${left}%`,
    width: size,
    height: size * (index % 3 === 0 ? 2.2 : 1),
    background: color,
    borderRadius: index % 5 === 0 ? 999 : 2,
    ["--drift" as string]: `${drift}px`,
    ["--spin" as string]: `${360 + ((index * 97) % 720)}deg`,
    ["--dur" as string]: `${2.6 + ((index * 7) % 14) / 10}s`,
    ["--delay" as string]: `${((index * 13) % 12) / 10}s`,
  };
}

function useCountUp(from: number, to: number, durationMs: number) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    let frame = 0;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now() + 450; // arranca cuando aparece el emblema
    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min(1, Math.max(0, (now - start) / durationMs));
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (to - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, durationMs]);
  return value;
}

export function RecordCelebration({
  record,
  exerciseName,
  onClose,
  onShare,
}: {
  record: RecordEvent;
  exerciseName: string;
  onClose: () => void;
  onShare: () => void;
}) {
  const standing = record.exerciseAfter ?? record.generalAfter;
  const accent = standing.rank.color;
  const value = useCountUp(record.previousKg, record.newKg, 1100);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const delta = record.newKg - record.previousKg;
  const first = record.kind === "first";
  const rankUp = record.exerciseRankUp;
  const generalUp = record.generalRankUp;
  const canShare = standing.rank.minScore >= SHARE_MIN_SCORE;

  useEffect(() => {
    closeRef.current?.focus();
    try {
      navigator.vibrate?.([40, 60, 40]);
    } catch {
      // Algunos navegadores no permiten vibrar: da igual.
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={first ? "Primera marca" : "Nueva marca personal"}
      className="rg-fade-in fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/85 px-6 backdrop-blur-md"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {Array.from({ length: CONFETTI }, (_, index) => (
          <span key={index} className="rg-confetti" style={confettiStyle(index, accent)} />
        ))}
      </div>

      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <div className="relative flex h-56 w-56 items-center justify-center">
          {[0, 0.25, 0.5].map((delay) => (
            <span
              key={delay}
              aria-hidden="true"
              className="rg-ring absolute h-40 w-40 rounded-full border-2"
              style={{ borderColor: accent, animationDelay: `${0.35 + delay}s` }}
            />
          ))}
          <span
            aria-hidden="true"
            className="absolute h-44 w-44 rounded-full opacity-70 blur-3xl"
            style={{ background: standing.rank.glow }}
          />
          <div className="rg-pop relative" style={{ animationDelay: "0.15s" }}>
            <RankBadge rankId={standing.rank.id} size={190} glow={standing.rank.glow} />
          </div>
        </div>

        <p
          className="rg-rise mt-2 text-[13px] font-bold tracking-[0.28em] uppercase"
          style={{ color: accent, animationDelay: "0.5s" }}
        >
          {first ? "¡Primera marca!" : "¡Nueva marca personal!"}
        </p>
        <h2 className="rg-rise mt-2 text-[26px] leading-tight font-semibold" style={{ animationDelay: "0.6s" }}>
          {exerciseName}
        </h2>

        <p
          className="rg-rise mt-3 text-[64px] leading-none font-black tabular-nums"
          style={{ animationDelay: "0.7s" }}
          aria-label={`1RM ${formatKg(record.newKg)}`}
        >
          {value >= record.newKg ? Math.round(record.newKg * 10) / 10 : value.toFixed(1)}
          <span className="ml-1 text-[24px] font-semibold text-white/60">kg</span>
        </p>
        <p className="rg-rise mt-1 text-[13px] text-white/50" style={{ animationDelay: "0.75s" }}>
          1RM estimado
        </p>

        {!first && delta > 0 && (
          <span
            className="rg-rise mt-3 rounded-full px-4 py-1.5 text-[15px] font-bold text-black"
            style={{ background: accent, animationDelay: "0.9s" }}
          >
            +{Math.round(delta * 10) / 10} kg
          </span>
        )}

        <div className="rg-rise mt-4 flex flex-col gap-1.5" style={{ animationDelay: "1s" }}>
          {record.exerciseAfter && (
            <p className="text-[16px] font-semibold" style={{ color: accent }}>
              {rankUp && record.exerciseBefore
                ? `¡Subes de ${record.exerciseBefore.label} a ${record.exerciseAfter.label}!`
                : `${record.exerciseAfter.label} · ${record.exerciseAfter.points} pts`}
            </p>
          )}
          {generalUp && (
            <p className="text-[15px] font-semibold text-amber-200">
              🎉 Tu rango general sube a {record.generalAfter.label}
            </p>
          )}
        </div>

        <div className="rg-rise mt-7 flex w-full flex-col gap-2" style={{ animationDelay: "1.15s" }}>
          {canShare && (
            <button
              type="button"
              onClick={onShare}
              className="h-14 w-full rounded-full text-[16px] font-semibold text-black"
              style={{ background: accent }}
            >
              Compartir esta marca
            </button>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`h-14 w-full rounded-full text-[16px] font-semibold ${
              canShare ? "glass" : "bg-white text-black"
            }`}
          >
            Seguir
          </button>
        </div>
      </div>
    </div>
  );
}
