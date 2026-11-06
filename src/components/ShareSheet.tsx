"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { formatKg, formatPercent } from "../lib/engine";
import { shortName } from "../lib/exercises";
import { SHARE_MIN_SCORE } from "../lib/ranks";
import {
  canvasToPng,
  drawShareCard,
  loadPhoto,
  photoRect,
  SHARE_SIZES,
  type PhotoView,
  type ShareCardData,
  type SharePhoto,
  type ShareFormat,
} from "../lib/shareCard";
import type { Exercise, LiftId, Profile, RankSnapshot } from "../lib/types";
import { ErrorNote } from "./ui";

const GENERAL = "__general__";
const DEFAULT_VIEW: PhotoView = { zoom: 1, panX: 0, panY: 0 };

function fileSlug(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "rango"
  );
}

export function ShareSheet({
  profile,
  snapshot,
  getExercise,
  initialLift,
  onClose,
}: {
  profile: Profile;
  snapshot: RankSnapshot;
  getExercise: (id: LiftId) => Exercise | undefined;
  /** Ejercicio preseleccionado; sin valor, el rango general. */
  initialLift?: LiftId;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const generalOk = snapshot.score >= SHARE_MIN_SCORE;
  const shareable = useMemo(
    () => snapshot.lifts.filter((lift) => lift.oneRm > 0 && lift.score >= SHARE_MIN_SCORE),
    [snapshot.lifts],
  );

  const [target, setTarget] = useState<string>(() => {
    if (initialLift && shareable.some((lift) => lift.lift === initialLift)) return initialLift;
    return generalOk ? GENERAL : (shareable[0]?.lift ?? GENERAL);
  });
  const [format, setFormat] = useState<ShareFormat>("story");
  const [photo, setPhoto] = useState<SharePhoto | null>(null);
  const [view, setView] = useState<PhotoView>(DEFAULT_VIEW);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  const unlocked = generalOk || shareable.length > 0;
  const lift = target === GENERAL ? null : snapshot.lifts.find((item) => item.lift === target);
  const standing = lift ? lift.standing : snapshot.standing;
  const canShareTarget = lift ? lift.score >= SHARE_MIN_SCORE : generalOk;

  const card: ShareCardData = useMemo(() => {
    const top = lift ? lift.percentile : snapshot.percentile;
    return {
      name: profile.name,
      rankName: standing.rank.name,
      division: standing.division ? ["", "I", "II", "III"][standing.division] : "",
      points: standing.points,
      icon: standing.rank.icon,
      color: standing.rank.color,
      glow: standing.rank.glow,
      mark: lift
        ? `${shortName(lift.lift, getExercise(lift.lift))} · ${formatKg(lift.oneRm)} 1RM`
        : `Rango general · Nivel ${Math.round(snapshot.score)}/100`,
      scope: lift ? shortName(lift.lift, getExercise(lift.lift)) : "Rango general",
      topLabel: `TOP ${formatPercent(Math.max(0.1, 100 - top))}%`,
      progress: standing.progress,
      photo,
      view,
    };
  }, [profile.name, lift, snapshot.percentile, snapshot.score, standing, getExercise, photo, view]);

  const size = SHARE_SIZES[format];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawShareCard(ctx, size.width, size.height, card);
  }, [card, size.width, size.height]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setDone("");
    try {
      const next = await loadPhoto(file);
      setPhoto(next);
      setView(DEFAULT_VIEW);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la foto.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!photo) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, panX: view.panX, panY: view.panY };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const start = drag.current;
    if (!start || !photo) return;
    const box = event.currentTarget.getBoundingClientRect();
    const scale = size.width / box.width;
    const rect = photoRect(photo, size.width, size.height, { ...view, panX: 0, panY: 0 });
    const slackX = (rect.w - size.width) / 2;
    const slackY = (rect.h - size.height) / 2;
    const dx = (event.clientX - start.x) * scale;
    const dy = (event.clientY - start.y) * scale;
    // Arrastrar la foto hacia la derecha mueve su contenido a la derecha.
    const panX = slackX > 0 ? start.panX + dx / slackX : 0;
    const panY = slackY > 0 ? start.panY + dy / slackY : 0;
    setView((current) => ({
      ...current,
      panX: Math.max(-1, Math.min(1, panX)),
      panY: Math.max(-1, Math.min(1, panY)),
    }));
  }

  function endDrag() {
    drag.current = null;
  }

  async function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("La tarjeta no está lista.");
    // Redibuja por si la vista previa cambió justo antes de exportar.
    const ctx = canvas.getContext("2d");
    if (ctx) drawShareCard(ctx, size.width, size.height, card);
    const blob = await canvasToPng(canvas);
    const name = `rankedgg-${fileSlug(profile.name)}-${fileSlug(card.scope)}.png`;
    return new File([blob], name, { type: "image/png" });
  }

  async function download() {
    setBusy(true);
    setError("");
    setDone("");
    try {
      const file = await exportPng();
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setDone("Imagen guardada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la imagen.");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    setError("");
    setDone("");
    try {
      const file = await exportPng();
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: "RankedGG",
          text: `${card.rankName} ${card.division} en ${card.scope} · RankedGG`.replace(/\s+/g, " "),
        });
      } else {
        await download();
      }
    } catch (err) {
      // Cancelar el panel de compartir no es un error.
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "No se pudo compartir la imagen.");
    } finally {
      setBusy(false);
    }
  }

  const needMessage = `Alcanza ${"Bronce"} (nivel ${SHARE_MIN_SCORE}) ${lift ? "en este ejercicio" : "en tu rango general"} para compartirlo.`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compartir rango"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md"
    >
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 px-4 pt-[calc(16px+var(--safe-top))] pb-[calc(24px+var(--safe-bottom))]">
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-semibold tracking-tight">Compartir rango</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="glass flex h-11 w-11 items-center justify-center rounded-full text-[18px]"
          >
            ✕
          </button>
        </div>

        {!unlocked ? (
          <div className="glass rounded-[28px] px-5 py-6 text-center">
            <p className="text-[40px]">🔒</p>
            <p className="mt-2 text-[17px] font-semibold">Aún no puedes compartir</p>
            <p className="mt-2 text-[14px] leading-5 text-white/65">
              Sube una marca hasta Bronce (nivel {SHARE_MIN_SCORE}) en cualquier ejercicio, o
              en tu rango general, y se desbloquea la tarjeta.
            </p>
          </div>
        ) : (
          <>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              <Chip active={target === GENERAL} disabled={!generalOk} onClick={() => setTarget(GENERAL)}>
                Rango general
              </Chip>
              {snapshot.lifts
                .filter((item) => item.oneRm > 0)
                .map((item) => (
                  <Chip
                    key={item.lift}
                    active={target === item.lift}
                    disabled={item.score < SHARE_MIN_SCORE}
                    onClick={() => setTarget(item.lift)}
                  >
                    {shortName(item.lift, getExercise(item.lift))}
                  </Chip>
                ))}
            </div>

            <div className="flex gap-2">
              <Segment active={format === "story"} onClick={() => setFormat("story")}>
                Historia 9:16
              </Segment>
              <Segment active={format === "post"} onClick={() => setFormat("post")}>
                Post 4:5
              </Segment>
            </div>

            {!canShareTarget && <ErrorNote>{needMessage}</ErrorNote>}

            <div className="overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-2xl">
              <canvas
                ref={canvasRef}
                width={size.width}
                height={size.height}
                aria-label="Vista previa de la tarjeta"
                className="block h-auto w-full touch-none select-none"
                style={{ aspectRatio: `${size.width} / ${size.height}`, cursor: photo ? "grab" : "default" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Elegir foto de la galería"
              onChange={(event) => void onPickFile(event.target.files?.[0])}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="glass h-12 flex-1 rounded-full text-[15px] font-semibold"
              >
                {photo ? "Cambiar foto" : "📷 Añadir mi foto"}
              </button>
              {photo && (
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    setView(DEFAULT_VIEW);
                  }}
                  className="glass h-12 rounded-full px-5 text-[15px]"
                >
                  Quitar
                </button>
              )}
            </div>

            {photo && (
              <label className="glass flex items-center gap-3 rounded-full px-5 py-3 text-[13px] text-white/70">
                Zoom
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={view.zoom}
                  aria-label="Zoom de la foto"
                  onChange={(event) =>
                    setView((current) => ({ ...current, zoom: Number(event.target.value) }))
                  }
                  className="h-2 flex-1 accent-white"
                />
              </label>
            )}
            {photo && (
              <p className="px-2 text-center text-[12px] text-white/45">
                Arrastra la foto para encuadrarte.
              </p>
            )}

            {error && <ErrorNote>{error}</ErrorNote>}
            {done && (
              <p role="status" className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-[14px] text-emerald-200">
                {done}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy || !canShareTarget}
                onClick={() => void share()}
                className="h-14 flex-1 rounded-full bg-white text-[16px] font-semibold text-black disabled:opacity-40"
              >
                Compartir
              </button>
              <button
                type="button"
                disabled={busy || !canShareTarget}
                onClick={() => void download()}
                className="glass h-14 rounded-full px-6 text-[16px] font-semibold disabled:opacity-40"
              >
                Guardar PNG
              </button>
            </div>
            <p className="px-2 text-center text-[12px] leading-4 text-white/40">
              Tu foto se queda en tu dispositivo: la tarjeta se genera aquí y no se sube a ningún servidor.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium ${
        active ? "bg-white text-black" : "glass text-white/80"
      } ${disabled ? "opacity-50" : ""}`}
    >
      {disabled ? "🔒 " : ""}
      {children}
    </button>
  );
}

function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-11 flex-1 rounded-full text-[14px] font-semibold ${
        active ? "bg-white/90 text-black" : "glass text-white/75"
      }`}
    >
      {children}
    </button>
  );
}
