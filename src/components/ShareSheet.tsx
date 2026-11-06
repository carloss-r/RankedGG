"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { loadBadgeImage } from "../lib/badges";
import { formatKg, formatPercent } from "../lib/engine";
import { shortName } from "../lib/exercises";
import {
  canvasToPng,
  DEFAULT_STYLE,
  drawShareCard,
  FONT_IDS,
  FONTS,
  loadPhoto,
  normalizeStyle,
  photoRect,
  SHARE_FIELDS,
  SHARE_SIZES,
  type Align,
  type BlockRect,
  type PhotoView,
  type ShareCardData,
  type SharePhoto,
  type ShareFormat,
  type ShareStyle,
} from "../lib/shareCard";
import type { Exercise, LiftId, Profile, RankSnapshot } from "../lib/types";
import { ErrorNote } from "./ui";

const GENERAL = "__general__";
const DEFAULT_VIEW: PhotoView = { zoom: 1, panX: 0, panY: 0 };
const STYLE_KEY = "rankedgg:share-style";

function loadStyle(): ShareStyle {
  try {
    const raw = window.localStorage.getItem(STYLE_KEY);
    return normalizeStyle(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeStyle(null);
  }
}

const POSITIONS: { label: string; x: number; y: number; align: Align }[] = [
  { label: "arriba a la izquierda", x: 0, y: 0, align: "left" },
  { label: "arriba al centro", x: 0.5, y: 0, align: "center" },
  { label: "arriba a la derecha", x: 1, y: 0, align: "right" },
  { label: "en medio a la izquierda", x: 0, y: 0.5, align: "left" },
  { label: "en el centro", x: 0.5, y: 0.5, align: "center" },
  { label: "en medio a la derecha", x: 1, y: 0.5, align: "right" },
  { label: "abajo a la izquierda", x: 0, y: 1, align: "left" },
  { label: "abajo al centro", x: 0.5, y: 1, align: "center" },
  { label: "abajo a la derecha", x: 1, y: 1, align: "right" },
];

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
  const layoutRef = useRef<BlockRect | null>(null);
  const drag = useRef<
    | { kind: "photo"; x: number; y: number; panX: number; panY: number }
    | { kind: "data"; x: number; y: number; cx: number; cy: number }
    | null
  >(null);

  const shareable = useMemo(() => snapshot.lifts.filter((lift) => lift.oneRm > 0), [snapshot.lifts]);

  const [target, setTarget] = useState<string>(() =>
    initialLift && shareable.some((lift) => lift.lift === initialLift) ? initialLift : GENERAL,
  );
  const [style, setStyle] = useState<ShareStyle>(loadStyle);
  const [dragMode, setDragMode] = useState<"data" | "photo">("data");
  const [format, setFormat] = useState<ShareFormat>("story");
  const [photo, setPhoto] = useState<SharePhoto | null>(null);
  const [view, setView] = useState<PhotoView>(DEFAULT_VIEW);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [badge, setBadge] = useState<{ id: string; image: HTMLImageElement } | null>(null);

  const lift = target === GENERAL ? null : snapshot.lifts.find((item) => item.lift === target);
  const standing = lift ? lift.standing : snapshot.standing;

  const badgeRankId = standing.rank.id;
  useEffect(() => {
    let cancelled = false;
    loadBadgeImage(badgeRankId, 640)
      .then((image) => {
        if (!cancelled) setBadge({ id: badgeRankId, image });
      })
      .catch(() => {
        if (!cancelled) setBadge(null);
      });
    return () => {
      cancelled = true;
    };
  }, [badgeRankId]);

  const card: ShareCardData = useMemo(() => {
    const top = lift ? lift.percentile : snapshot.percentile;
    return {
      name: profile.name,
      rankName: standing.rank.name,
      division: standing.division ? ["", "I", "II", "III"][standing.division] : "",
      points: standing.points,
      color: standing.rank.color,
      glow: standing.rank.glow,
      markValue: lift ? formatKg(lift.oneRm) : `${Math.round(snapshot.score)}/100`,
      markLabel: lift ? "1RM ESTIMADO" : "NIVEL GENERAL",
      scope: lift ? shortName(lift.lift, getExercise(lift.lift)) : "Rango general",
      topLabel: `TOP ${formatPercent(Math.max(0.1, 100 - top))}%`,
      progress: standing.progress,
      photo,
      view,
      badge: badge && badge.id === badgeRankId ? badge.image : null,
      nextName: standing.nextRank?.name ?? null,
      style,
    };
  }, [profile.name, lift, snapshot.percentile, snapshot.score, standing, getExercise, photo, view, badge, badgeRankId, style]);

  const size = SHARE_SIZES[format];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    layoutRef.current = drawShareCard(ctx, size.width, size.height, card);
  }, [card, size.width, size.height]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STYLE_KEY, JSON.stringify(style));
    } catch {
      // Sin almacenamiento disponible: el estilo solo dura mientras la hoja está abierta.
    }
  }, [style]);

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
    const box = event.currentTarget.getBoundingClientRect();
    const scale = size.width / box.width;
    if (dragMode === "photo") {
      if (!photo) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { kind: "photo", x: event.clientX, y: event.clientY, panX: view.panX, panY: view.panY };
      return;
    }
    const block = layoutRef.current;
    if (!block) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      kind: "data",
      x: event.clientX * scale,
      y: event.clientY * scale,
      cx: block.x + block.w / 2,
      cy: block.y + block.h / 2,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const start = drag.current;
    if (!start) return;
    const box = event.currentTarget.getBoundingClientRect();
    const scale = size.width / box.width;
    if (start.kind === "data") {
      const dx = event.clientX * scale - start.x;
      const dy = event.clientY * scale - start.y;
      setStyle((current) => ({
        ...current,
        x: Math.max(0, Math.min(1, (start.cx + dx) / size.width)),
        y: Math.max(0, Math.min(1, (start.cy + dy) / size.height)),
      }));
      return;
    }
    if (!photo) return;
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

  const setShow = (field: (typeof SHARE_FIELDS)[number]["id"]) =>
    setStyle((current) => ({ ...current, show: { ...current.show, [field]: !current.show[field] } }));

  const atPosition = (pos: (typeof POSITIONS)[number]) =>
    Math.abs(style.x - pos.x) < 0.02 && Math.abs(style.y - pos.y) < 0.02;

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

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Chip active={target === GENERAL} onClick={() => setTarget(GENERAL)}>
            Rango general
          </Chip>
          {shareable.map((item) => (
            <Chip key={item.lift} active={target === item.lift} onClick={() => setTarget(item.lift)}>
              {shortName(item.lift, getExercise(item.lift))}
            </Chip>
          ))}
        </div>

        <div className="overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-2xl">
          <canvas
            ref={canvasRef}
            width={size.width}
            height={size.height}
            aria-label="Vista previa de la tarjeta"
            className="block h-auto w-full touch-none select-none"
            style={{
              aspectRatio: `${size.width} / ${size.height}`,
              cursor: dragMode === "photo" && !photo ? "default" : "grab",
            }}
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
                setDragMode("data");
              }}
              className="glass h-12 rounded-full px-5 text-[15px]"
            >
              Quitar
            </button>
          )}
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}
        {done && (
          <p role="status" className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-[14px] text-emerald-200">
            {done}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void share()}
            className="h-14 flex-1 rounded-full bg-white text-[16px] font-semibold text-black disabled:opacity-40"
          >
            Compartir
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void download()}
            className="glass h-14 rounded-full px-6 text-[16px] font-semibold disabled:opacity-40"
          >
            Guardar PNG
          </button>
        </div>

        <section className="glass flex flex-col gap-5 rounded-[28px] px-4 py-5" aria-label="Personalizar">
          <h3 className="text-[12px] tracking-[0.16em] text-white/45 uppercase">Personalizar</h3>

          <Group title="Arrastrar en la imagen">
            <div className="flex gap-2">
              <Segment active={dragMode === "data"} onClick={() => setDragMode("data")}>
                Los datos
              </Segment>
              <Segment
                active={dragMode === "photo"}
                onClick={() => photo && setDragMode("photo")}
                dim={!photo}
              >
                La foto
              </Segment>
            </div>
            {photo && dragMode === "photo" && (
              <label className="flex items-center gap-3 px-1 text-[13px] text-white/70">
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
          </Group>

          <Group title="Posición de los datos">
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Posición">
              {POSITIONS.map((pos) => (
                <button
                  key={pos.label}
                  type="button"
                  aria-label={`Datos ${pos.label}`}
                  aria-pressed={atPosition(pos)}
                  onClick={() => setStyle((current) => ({ ...current, x: pos.x, y: pos.y, align: pos.align }))}
                  className={`flex h-11 items-center rounded-xl px-3 ${
                    pos.align === "left" ? "justify-start" : pos.align === "center" ? "justify-center" : "justify-end"
                  } ${atPosition(pos) ? "bg-white" : "bg-white/8"}`}
                >
                  <span className={`block h-1.5 w-5 rounded-full ${atPosition(pos) ? "bg-black" : "bg-white/50"}`} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(["left", "center", "right"] as const).map((align) => (
                <Segment
                  key={align}
                  active={style.align === align}
                  onClick={() => setStyle((current) => ({ ...current, align }))}
                >
                  {align === "left" ? "Izquierda" : align === "center" ? "Centro" : "Derecha"}
                </Segment>
              ))}
            </div>
          </Group>

          <Group title="Tipografía">
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
              {FONT_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={style.font === id}
                  onClick={() => setStyle((current) => ({ ...current, font: id }))}
                  className={`h-12 shrink-0 rounded-2xl px-5 text-[17px] ${
                    style.font === id ? "bg-white text-black" : "bg-white/8 text-white/85"
                  }`}
                  style={{
                    fontFamily: FONTS[id].family,
                    fontWeight: FONTS[id].valueWeight,
                    fontStyle: FONTS[id].italic ? "italic" : "normal",
                  }}
                >
                  {FONTS[id].label}
                </button>
              ))}
            </div>
          </Group>

          <Group title="Datos a mostrar">
            <div className="flex flex-wrap gap-2">
              {SHARE_FIELDS.map((field) => (
                <button
                  key={field.id}
                  type="button"
                  aria-pressed={style.show[field.id]}
                  onClick={() => setShow(field.id)}
                  className={`h-9 rounded-full px-4 text-[13px] font-medium ${
                    style.show[field.id] ? "bg-white text-black" : "bg-white/8 text-white/60"
                  }`}
                >
                  {field.label}
                </button>
              ))}
            </div>
          </Group>

          <Group title="Estilo">
            <label className="flex items-center gap-3 px-1 text-[13px] text-white/70">
              <span className="w-20 shrink-0">Tamaño</span>
              <input
                type="range"
                min={0.7}
                max={1.5}
                step={0.01}
                value={style.scale}
                aria-label="Tamaño de los datos"
                onChange={(event) => setStyle((current) => ({ ...current, scale: Number(event.target.value) }))}
                className="h-2 flex-1 accent-white"
              />
            </label>
            <label className="flex items-center gap-3 px-1 text-[13px] text-white/70">
              <span className="w-20 shrink-0">Oscurecer</span>
              <input
                type="range"
                min={0}
                max={0.8}
                step={0.01}
                value={style.dim}
                aria-label="Oscurecer la foto"
                onChange={(event) => setStyle((current) => ({ ...current, dim: Number(event.target.value) }))}
                className="h-2 flex-1 accent-white"
              />
            </label>
            <div className="flex gap-2">
              <Segment
                active={style.colorMode === "rank"}
                onClick={() => setStyle((current) => ({ ...current, colorMode: "rank" }))}
              >
                Color del rango
              </Segment>
              <Segment
                active={style.colorMode === "white"}
                onClick={() => setStyle((current) => ({ ...current, colorMode: "white" }))}
              >
                Blanco
              </Segment>
            </div>
            <div className="flex gap-2">
              <Segment active={format === "story"} onClick={() => setFormat("story")}>
                Historia 9:16
              </Segment>
              <Segment active={format === "post"} onClick={() => setFormat("post")}>
                Post 4:5
              </Segment>
            </div>
          </Group>

          <button
            type="button"
            onClick={() => setStyle(normalizeStyle(DEFAULT_STYLE))}
            className="h-11 rounded-full bg-white/8 text-[14px] text-white/70"
          >
            Restablecer estilo
          </button>
        </section>

        <p className="px-2 text-center text-[12px] leading-4 text-white/40">
          Tu foto se queda en tu dispositivo: la tarjeta se genera aquí y no se sube a ningún servidor.
          Las tipografías son las del sistema, así que pueden verse un poco distintas en otro teléfono.
        </p>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="px-1 text-[12px] font-medium text-white/55">{title}</p>
      {children}
    </div>
  );
}

function Chip({
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
      className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium ${
        active ? "bg-white text-black" : "glass text-white/80"
      }`}
    >
      {children}
    </button>
  );
}

function Segment({
  active,
  onClick,
  children,
  dim = false,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  dim?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-11 flex-1 rounded-full text-[14px] font-semibold ${
        active ? "bg-white/90 text-black" : "bg-white/8 text-white/75"
      } ${dim ? "opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}
