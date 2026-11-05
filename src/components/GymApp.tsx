"use client";

import { useState } from "react";
import { useAuth, type AuthApi } from "../hooks/useAuth";
import { useGym } from "../hooks/useGym";
import { cleanName } from "../lib/auth";
import type { Account } from "../lib/types";
import { AuthScreen } from "./AuthScreen";
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

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="text-center">
        <p className="text-[13px] tracking-[0.24em] text-white/40 uppercase">RankedGG</p>
        <p className="mt-3 text-[28px] font-semibold">Cargando</p>
      </div>
    </div>
  );
}

function Failure({ message, onLogout }: { message: string; onLogout?: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="text-[13px] tracking-[0.24em] text-white/40 uppercase">RankedGG</p>
      <h1 className="text-[26px] font-semibold tracking-tight">Algo salió mal</h1>
      <p role="alert" className="text-[15px] leading-6 text-white/65">
        {message}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-12 rounded-full bg-white px-6 text-[15px] font-semibold text-black"
        >
          Reintentar
        </button>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="h-12 rounded-full border border-white/20 px-6 text-[15px] text-white/80"
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  );
}

export function GymApp() {
  const auth = useAuth();

  if (!auth.ready) return <Loading />;
  if (auth.error) return <Failure message={auth.error} />;
  if (!auth.account) return <AuthScreen auth={auth} />;

  // `key` reinicia todo el estado al cambiar de cuenta.
  return <GymMain key={auth.account.id} account={auth.account} auth={auth} />;
}

function GymMain({ account, auth }: { account: Account; auth: AuthApi }) {
  const gym = useGym(account.id, account.name);
  const [tab, setTab] = useState<TabId>("home");
  const [menuOpen, setMenuOpen] = useState(false);

  if (gym.error) return <Failure message={gym.error} onLogout={() => void auth.logout()} />;
  if (!gym.ready || !gym.profile || !gym.snapshot) return <Loading />;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 px-5 pt-[calc(var(--safe-top)+18px)] pb-[calc(96px+var(--safe-bottom))]">
        {tab === "home" && (
          <HomeScreen
            profile={gym.profile}
            snapshot={gym.snapshot}
            getExercise={gym.getExercise}
          />
        )}
        {tab === "progress" && (
          <ProgressScreen entries={gym.entries} getExercise={gym.getExercise} />
        )}
        {tab === "ranks" && <RanksScreen snapshot={gym.snapshot} />}
        {tab === "log" && (
          <LogScreen
            entries={gym.entries}
            sessions={gym.sessions}
            activeSession={gym.activeSession}
            exercises={gym.exercises}
            getExercise={gym.getExercise}
            onLog={gym.logLift}
            onDelete={gym.removeLift}
            onStart={gym.startSession}
            onEnd={gym.endSession}
            onCreateExercise={gym.addCustomExercise}
          />
        )}
        {tab === "manual" && <ManualScreen />}
        {tab === "profile" && (
          <ProfileScreen
            account={account}
            profile={gym.profile}
            entriesCount={gym.entries.length}
            sessionsCount={gym.sessions.filter((item) => gym.entries.some((e) => e.sessionId === item.id)).length}
            onSave={async (input) => {
              // El nombre del perfil y el de la cuenta (el que se ve al entrar) van juntos.
              if ((cleanName(input.name) || "Atleta") !== account.name) {
                await auth.renameAccount(input.name);
              }
              await gym.upsertProfile(input);
            }}
            onLogout={async () => {
              await auth.logout();
            }}
            onChangePin={auth.changePin}
            onDeleteAccount={async () => {
              await auth.removeAccount(account.id);
            }}
          />
        )}
      </main>

      {/* Floating menu button */}
      <button
        type="button"
        aria-label="Abrir menú"
        aria-expanded={menuOpen}
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
