"use client";

import { useState } from "react";
import { useGym } from "../hooks/useGym";
import { Onboarding } from "./Onboarding";
import { HomeScreen } from "./screens/HomeScreen";
import { LogScreen } from "./screens/LogScreen";
import { ManualScreen } from "./screens/ManualScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { ProgressScreen } from "./screens/ProgressScreen";
import { RanksScreen } from "./screens/RanksScreen";

const TABS = [
  { id: "home", label: "Inicio" },
  { id: "progress", label: "Progreso" },
  { id: "ranks", label: "Rangos" },
  { id: "log", label: "Marcas" },
  { id: "manual", label: "Manual" },
  { id: "profile", label: "Yo" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function GymApp() {
  const gym = useGym();
  const [tab, setTab] = useState<TabId>("home");

  if (!gym.ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <p className="text-[13px] tracking-[0.24em] text-white/40 uppercase">RankedGG</p>
          <p className="mt-3 text-[28px] font-semibold">Cargando</p>
        </div>
      </div>
    );
  }

  if (!gym.profile || !gym.snapshot) {
    return (
      <Onboarding
        onComplete={async ({ name, sex, bodyweightKg, marks }) => {
          await gym.upsertProfile({ name, sex, bodyweightKg });
          for (const mark of marks) {
            await gym.logLift({ lift: mark.lift, weightKg: mark.weightKg, reps: 1 });
          }
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 px-5 pt-[calc(var(--safe-top)+18px)] pb-[calc(108px+var(--safe-bottom))]">
        {tab === "home" && <HomeScreen profile={gym.profile} snapshot={gym.snapshot} />}
        {tab === "progress" && <ProgressScreen entries={gym.entries} />}
        {tab === "ranks" && <RanksScreen snapshot={gym.snapshot} />}
        {tab === "log" && (
          <LogScreen entries={gym.entries} onLog={gym.logLift} onDelete={gym.removeLift} />
        )}
        {tab === "manual" && <ManualScreen />}
        {tab === "profile" && (
          <ProfileScreen
            profile={gym.profile}
            entriesCount={gym.entries.length}
            onSave={gym.upsertProfile}
            onReset={async () => {
              await gym.reset();
              setTab("home");
            }}
          />
        )}
      </main>

      <nav className="glass-strong fixed right-0 bottom-0 left-0 z-20 mx-auto max-w-md rounded-t-[28px] border-t border-white/10 px-3 pt-2 pb-[calc(10px+var(--safe-bottom))]">
        <div className="grid grid-cols-5">
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] ${
                  active ? "text-white" : "text-white/40"
                }`}
              >
                <TabIcon id={item.id} active={active} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function TabIcon({ id, active }: { id: TabId; active: boolean }) {
  const stroke = active ? "white" : "rgba(255,255,255,0.45)";
  if (id === "home") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z"
          stroke={stroke}
          strokeWidth="1.7"
        />
      </svg>
    );
  }
  if (id === "progress") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 16l5-5 4 4 7-8"
          stroke={stroke}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (id === "ranks") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M7 20V10h3v10H7Zm7 0V6h3v14h-3ZM4 20h16" stroke={stroke} strokeWidth="1.7" />
      </svg>
    );
  }
  if (id === "log") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "manual") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 6.25V3.5m0 2.75a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0V7a.75.75 0 0 1 .75-.75Zm0 9.5V18.5m0-2.75a.75.75 0 0 1 .75-.75v-2.5a.75.75 0 0 1-1.5 0v2.5a.75.75 0 0 1 .75.75ZM6 12a6 6 0 1 1 12 0 6 6 0 0 1-12 0Z" stroke={stroke} strokeWidth="1.7" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.2" stroke={stroke} strokeWidth="1.7" />
      <path d="M5 19c1.4-3.2 3.8-5 7-5s5.6 1.8 7 5" stroke={stroke} strokeWidth="1.7" />
    </svg>
  );
}
