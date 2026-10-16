"use client";

import { useState } from "react";
import { useGym } from "../hooks/useGym";
import { JoinSheet } from "./JoinSheet";
import { Onboarding } from "./Onboarding";
import { HomeScreen } from "./screens/HomeScreen";
import { LeaderboardScreen } from "./screens/LeaderboardScreen";
import { LogScreen } from "./screens/LogScreen";
import { ManualScreen } from "./screens/ManualScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { ProgressScreen } from "./screens/ProgressScreen";
import { RanksScreen } from "./screens/RanksScreen";

const TABS = [
  { id: "home", label: "Inicio" },
  { id: "progress", label: "Progreso" },
  { id: "ranks", label: "Rangos" },
  { id: "leaderboard", label: "Ranking" },
  { id: "log", label: "Marcas" },
  { id: "manual", label: "Manual" },
  { id: "profile", label: "Yo" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function GymApp() {
  const gym = useGym();
  const [tab, setTab] = useState<TabId>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  /** "Participar": si la base ya tiene tu registro entras directo; si no, se pide el nombre completo. */
  async function requestJoin() {
    const result = await gym.beginJoin();
    if (result === "needs_name") setJoinOpen(true);
  }

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
      <main className="flex-1 px-5 pt-[calc(var(--safe-top)+18px)] pb-[calc(20px+var(--safe-bottom))]">
        {tab === "home" && (
          <HomeScreen profile={gym.profile} snapshot={gym.snapshot} rpg={gym.rpg} />
        )}
        {tab === "progress" && <ProgressScreen entries={gym.entries} />}
        {tab === "ranks" && <RanksScreen snapshot={gym.snapshot} />}
        {tab === "leaderboard" && (
          <LeaderboardScreen
            playerId={gym.playerId}
            shareGlobally={gym.shareGlobally}
            sync={gym.sync}
            hasMarks={gym.entries.length > 0}
            onJoin={requestJoin}
          />
        )}
        {tab === "log" && (
          <LogScreen entries={gym.entries} onLog={gym.logLift} onDelete={gym.removeLift} />
        )}
        {tab === "manual" && <ManualScreen />}
        {tab === "profile" && (
          <ProfileScreen
            profile={gym.profile}
            entriesCount={gym.entries.length}
            shareGlobally={gym.shareGlobally}
            sync={gym.sync}
            onToggleGlobal={async (on) => {
              if (on) await requestJoin();
              else await gym.disableGlobal();
            }}
            onSave={gym.upsertProfile}
            onReset={async () => {
              await gym.reset();
              setTab("home");
            }}
          />
        )}
      </main>

      {joinOpen && (
        <JoinSheet
          initialName={gym.profile.name}
          onSubmit={gym.completeJoin}
          onClose={() => setJoinOpen(false)}
        />
      )}

      {/* Floating menu button */}
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="glass-strong fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 shadow-2xl"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Menu overlay */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="glass-strong fixed bottom-24 right-6 z-30 w-56 rounded-2xl border border-white/10 p-2 shadow-2xl">
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[15px] ${
                    active ? "bg-white/10 text-white" : "text-white/70"
                  }`}
                >
                  <TabIcon id={item.id} active={active} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </>
      )}
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
  if (id === "leaderboard") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M8 4h8v5a4 4 0 0 1-8 0V4Zm0 2H4v1a3 3 0 0 0 3 3M16 6h4v1a3 3 0 0 1-3 3M12 13v4m-3 3h6"
          stroke={stroke}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
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
