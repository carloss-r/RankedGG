"use client";

import { useEffect, useRef } from "react";
import { RANKS } from "../lib/ranks";
import type { RankId } from "../lib/types";
import { RankBadge } from "./RankBadge";

/** Camino de rangos: de Madera a Mr Olympia, con el actual centrado y los siguientes apagados. */
export function RankRoad({ currentId }: { currentId: RankId }) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const currentIndex = RANKS.findIndex((rank) => rank.id === currentId);

  useEffect(() => {
    const box = scroller.current;
    const node = box?.querySelector<HTMLElement>("[data-current='true']");
    if (!box || !node) return;
    // Se ve el inicio (Madera) mientras el rango actual quepa; si no, se centra el actual.
    const centered = node.offsetLeft - box.clientWidth / 2 + node.clientWidth / 2;
    box.scrollLeft = Math.max(0, node.offsetLeft + node.clientWidth > box.clientWidth ? centered : 0);
  }, [currentId]);

  return (
    <div ref={scroller} className="no-scrollbar -mx-5 overflow-x-auto px-5 py-2">
      <ol className="relative flex w-max items-start gap-1" aria-label="Camino de rangos">
        {RANKS.map((rank, index) => {
          const reached = index <= currentIndex;
          const current = index === currentIndex;
          return (
            <li
              key={rank.id}
              data-current={current}
              className="relative flex w-[74px] flex-col items-center gap-1.5"
            >
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-[27px] right-1/2 h-[3px] w-full rounded-full"
                  style={{ background: reached ? rank.color : "rgba(255,255,255,0.12)", opacity: reached ? 0.8 : 1 }}
                />
              )}
              <span
                className={`relative flex h-[56px] w-[56px] items-center justify-center rounded-full ${
                  current ? "ring-2 ring-white/80" : ""
                }`}
                style={{ background: current ? rank.glow : "rgba(5,6,10,0.7)" }}
              >
                <RankBadge
                  rankId={rank.id}
                  size={44}
                  glow={current ? rank.glow : undefined}
                  className={current ? "rg-float" : ""}
                />
              </span>
              <span
                className={`text-center text-[11px] leading-tight ${
                  current ? "font-semibold text-white" : reached ? "text-white/75" : "text-white/35"
                }`}
              >
                {rank.name}
              </span>
              {index === 0 && (
                <span className="rounded-full bg-white/10 px-1.5 text-[9px] tracking-wider text-white/55 uppercase">
                  Inicio
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
