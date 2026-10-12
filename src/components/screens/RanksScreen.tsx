"use client";

import { RANKS } from "../../lib/ranks";
import type { RankSnapshot } from "../../lib/types";
import { Glass } from "../ui";

export function RanksScreen({ snapshot }: { snapshot: RankSnapshot }) {
  const currentIndex = RANKS.findIndex((rank) => rank.id === snapshot.rank.id);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-[13px] tracking-[0.18em] text-white/45 uppercase">Recompensas</p>
        <h1 className="mt-1 text-[32px] font-semibold tracking-tight">Rangos RPG</h1>
        <p className="mt-2 text-[15px] leading-6 text-white/60">
          De Madera a Mr Olympia. Cada rango compara tus 1RM con tablas mundiales de
          sentadilla, banca, peso muerto y press militar.
        </p>
      </header>

      <div className="relative flex flex-col gap-3">
        <div className="absolute top-4 bottom-4 left-[29px] w-px bg-white/12" />
        {RANKS.map((rank, index) => {
          const unlocked = index <= currentIndex;
          const current = rank.id === snapshot.rank.id;
          return (
            <Glass
              key={rank.id}
              className={`relative px-4 py-4 ${current ? "ring-2 ring-white/70" : ""}`}
              style={{ opacity: unlocked ? 1 : 0.48 }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl text-[20px]"
                  style={{ background: unlocked ? rank.glow : "rgba(255,255,255,0.06)" }}
                >
                  {rank.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[18px] font-semibold">{rank.name}</h2>
                    {current && (
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-black">
                        Actual
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-white/55">{rank.subtitle}</p>
                </div>
              </div>
            </Glass>
          );
        })}
      </div>
    </div>
  );
}
