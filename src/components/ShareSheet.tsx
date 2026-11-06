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
  type PreviewOverlay,
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
const MAX_ZOOM = 4;
const SNAP_PX = 16;
const NO_OVERLAY: PreviewOverlay = { outline: false, guideX: false, guideY: false };

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

type TabId = "marca" | "foto" | "datos" | "letra" | "lugar" | "estilo";
const TABS: { id: TabId; label: string }[] = [
  { id: "marca", label: "Marca" },
  { id: "foto", label: "Foto" },
  { id: "datos", label: "Datos" },
  { id: "letra", label: "Letra" },
  { id: "lugar", label: "Lugar" },
  { id: "estilo", label: "Estilo" },
];

type Pt = { x: number; y: number };
type Gesture =
  | { kind: "data"; start: Pt; cx: number; cy: number }
  | { kind: "photo"; start: Pt; panX: number; panY: number }
  | { kind: "pinch"; target: "photo" | "data"; dist: number; zoom: number; scale: number }
  | null;

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

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

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
  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<Gesture>(null);

  const shareable = useMemo(() => snapshot.lifts.filter((lift) => lift.oneRm > 0), [snapshot.lifts]);

  const [target, setTarget] = useState<string>(() =>
    initialLift && shareable.some((lift) => lift.lift === initialLift) ? initialLift : GENERAL,
  );
  const [style, setStyle] = useState<ShareStyle>(loadStyle);
  const [format, setFormat] = useState<ShareFormat>("story");
  const [photo, setPhoto] = useState<SharePhoto | null>(null);
  const [view, setView] = useState<PhotoView>(DEFAULT_VIEW);
  const [tab, setTab] = useState<TabId | null>(null);
  const [overlay, setOverlay] = useState<PreviewOverlay>(NO_OVERLAY);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [badge, setBadge] = useState<{ id: string; image: HTMLImageElement } | null>(null);

  const lift = target === GENERAL ? null : snapshot.lifts.find((item) => item.lift === target);
  const standing = lift ? lift.standing : snapshot.standing;
  const size = SHARE_SIZES[format];

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

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    layoutRef.current = drawShareCard(ctx, size.width, size.height, card, overlay);
  }, [card, size.width, size.height, overlay]);

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

  // Rueda del ratón = zoom de la foto (en escritorio). Necesita un listener no pasivo.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !photo) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0015);
      setView((current) => ({ ...current, zoom: clamp(current.zoom * factor, 1, MAX_ZOOM) }));
      setTouched(true);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [photo]);

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setDone("");
    try {
      const next = await loadPhoto(file);
      setPhoto(next);
      setView(DEFAULT_VIEW);
      setTab(null); // deja la imagen a la vista para encuadrarla
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la foto.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /* ----------------------------- gestos sobre la imagen ----------------------------- */

  /** Convierte coordenadas de pantalla a píxeles del lienzo (la imagen se ajusta con `contain`). */
  function toCanvas(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, scale: 1 };
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / size.width, rect.height / size.height) || 1;
    const ox = rect.left + (rect.width - size.width * scale) / 2;
    const oy = rect.top + (rect.height - size.height * scale) / 2;
    return { x: (clientX - ox) / scale, y: (clientY - oy) / scale, scale };
  }

  function insideData(c: Pt) {
    const block = layoutRef.current;
    if (!block) return false;
    const pad = 40;
    return c.x >= block.x - pad && c.x <= block.x + block.w + pad && c.y >= block.y - pad && c.y <= block.y + block.h + pad;
  }

  /** Decide qué hace el gesto según cuántos dedos hay y dónde empezó. */
  function beginGesture() {
    const pts = [...pointers.current.values()];
    if (pts.length === 0) {
      gesture.current = null;
      return;
    }
    if (pts.length === 1) {
      const c = toCanvas(pts[0].x, pts[0].y);
      const block = layoutRef.current;
      if (block && (insideData(c) || !photo)) {
        gesture.current = { kind: "data", start: c, cx: block.x + block.w / 2, cy: block.y + block.h / 2 };
        setOverlay({ outline: true, guideX: false, guideY: false });
      } else if (photo) {
        gesture.current = { kind: "photo", start: pts[0], panX: view.panX, panY: view.panY };
      } else {
        gesture.current = null;
      }
      return;
    }
    const [a, b] = pts;
    const mid = toCanvas((a.x + b.x) / 2, (a.y + b.y) / 2);
    gesture.current = {
      kind: "pinch",
      target: photo && !insideData(mid) ? "photo" : "data",
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      zoom: view.zoom,
      scale: style.scale,
    };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setTouched(true);
    beginGesture();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;
    if (!g) return;

    if (g.kind === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const ratio = (Math.hypot(a.x - b.x, a.y - b.y) || 1) / g.dist;
      if (g.target === "photo") {
        setView((current) => ({ ...current, zoom: clamp(g.zoom * ratio, 1, MAX_ZOOM) }));
      } else {
        setStyle((current) => ({ ...current, scale: clamp(g.scale * ratio, 0.7, 1.5) }));
      }
      return;
    }

    if (g.kind === "data") {
      const c = toCanvas(event.clientX, event.clientY);
      let cx = g.cx + (c.x - g.start.x);
      let cy = g.cy + (c.y - g.start.y);
      // Imán al centro, como en las historias de Instagram.
      const guideX = Math.abs(cx - size.width / 2) < SNAP_PX;
      const guideY = Math.abs(cy - size.height / 2) < SNAP_PX;
      if (guideX) cx = size.width / 2;
      if (guideY) cy = size.height / 2;
      setStyle((current) => ({
        ...current,
        x: clamp(cx / size.width, 0, 1),
        y: clamp(cy / size.height, 0, 1),
      }));
      setOverlay((current) =>
        current.guideX === guideX && current.guideY === guideY && current.outline
          ? current
          : { outline: true, guideX, guideY },
      );
      return;
    }

    if (!photo) return;
    const { scale } = toCanvas(event.clientX, event.clientY);
    const rect = photoRect(photo, size.width, size.height, { ...view, panX: 0, panY: 0 });
    const slackX = (rect.w - size.width) / 2;
    const slackY = (rect.h - size.height) / 2;
    const dx = (event.clientX - g.start.x) / scale;
    const dy = (event.clientY - g.start.y) / scale;
    // Arrastrar la foto hacia la derecha mueve su contenido a la derecha.
    setView((current) => ({
      ...current,
      panX: slackX > 0 ? clamp(g.panX + dx / slackX, -1, 1) : 0,
      panY: slackY > 0 ? clamp(g.panY + dy / slackY, -1, 1) : 0,
    }));
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(event.pointerId);
    beginGesture(); // si queda un dedo, sigue arrastrando desde donde está
    if (pointers.current.size === 0) setOverlay(NO_OVERLAY);
  }

  /* ------------------------------- exportar / compartir ------------------------------- */

  async function exportPng() {
    // Se dibuja en un lienzo aparte, sin guías, para no tocar la vista previa.
    const off = document.createElement("canvas");
    off.width = size.width;
    off.height = size.height;
    const ctx = off.getContext("2d");
    if (!ctx) throw new Error("La tarjeta no está lista.");
    drawShareCard(ctx, size.width, size.height, card);
    const blob = await canvasToPng(off);
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
      setTimeout(() => setDone(""), 2500);
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

  /* --------------------------------------- UI --------------------------------------- */

  const setShow = (field: (typeof SHARE_FIELDS)[number]["id"]) =>
    setStyle((current) => ({ ...current, show: { ...current.show, [field]: !current.show[field] } }));

  const atPosition = (pos: (typeof POSITIONS)[number]) =>
    Math.abs(style.x - pos.x) < 0.02 && Math.abs(style.y - pos.y) < 0.02;

  // En escritorio el panel siempre está visible; en el móvil solo cuando se elige una pestaña.
  const shownTab: TabId = tab ?? "foto";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compartir rango"
      className="fixed inset-0 z-50 flex flex-col bg-[#05060a] md:flex-row"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center gap-2 px-3 pt-[calc(10px+var(--safe-top))] pb-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[18px]"
          >
            ✕
          </button>
          <p className="min-w-0 flex-1 truncate px-1 text-[15px] font-semibold">
            {card.scope} · {standing.label}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void download()}
            aria-label="Guardar PNG"
            className="glass flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void share()}
            className="h-11 shrink-0 rounded-full bg-white px-5 text-[15px] font-semibold text-black disabled:opacity-40"
          >
            Compartir
          </button>
        </header>

        <div className="relative min-h-0 flex-1 px-3 pb-2">
          <canvas
            ref={canvasRef}
            width={size.width}
            height={size.height}
            aria-label="Vista previa de la tarjeta"
            className="block h-full w-full touch-none select-none"
            style={{ objectFit: "contain", cursor: "grab" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          />
          {!touched && (
            <p className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-max max-w-[90%] rounded-full bg-black/60 px-4 py-1.5 text-center text-[12px] text-white/80 backdrop-blur">
              Arrastra para mover · pellizca para hacer zoom
            </p>
          )}
          {(error || done) && (
            <div className="absolute inset-x-6 bottom-4">
              {error ? (
                <ErrorNote>{error}</ErrorNote>
              ) : (
                <p role="status" className="rounded-2xl bg-emerald-500/25 px-4 py-3 text-center text-[14px] text-emerald-100 backdrop-blur">
                  {done}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Elegir foto de la galería"
        onChange={(event) => void onPickFile(event.target.files?.[0])}
      />

      <aside className="flex shrink-0 flex-col border-t border-white/10 bg-black/40 pb-[var(--safe-bottom)] md:w-[380px] md:overflow-y-auto md:border-t-0 md:border-l">
        <div
          className={`${tab === null ? "hidden md:block" : "block"} max-h-[36dvh] overflow-y-auto px-4 py-3 md:max-h-none md:order-2 md:px-5 md:py-4`}
        >
          {shownTab === "marca" && (
            <div className="flex flex-col gap-4">
              <Group title="Qué compartir">
                <div className="flex flex-wrap gap-2">
                  <Chip active={target === GENERAL} onClick={() => setTarget(GENERAL)}>
                    Rango general
                  </Chip>
                  {shareable.map((item) => (
                    <Chip key={item.lift} active={target === item.lift} onClick={() => setTarget(item.lift)}>
                      {shortName(item.lift, getExercise(item.lift))}
                    </Chip>
                  ))}
                </div>
              </Group>
              <Group title="Formato">
                <div className="flex gap-2">
                  <Segment active={format === "story"} onClick={() => setFormat("story")}>
                    Historia 9:16
                  </Segment>
                  <Segment active={format === "post"} onClick={() => setFormat("post")}>
                    Post 4:5
                  </Segment>
                </div>
              </Group>
            </div>
          )}

          {shownTab === "foto" && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="h-12 flex-1 rounded-full bg-white text-[15px] font-semibold text-black"
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
                    className="h-12 rounded-full bg-white/10 px-5 text-[15px]"
                  >
                    Quitar
                  </button>
                )}
              </div>
              {photo ? (
                <>
                  <label className="flex items-center gap-3 px-1 text-[13px] text-white/70">
                    <span className="w-12 shrink-0">Zoom</span>
                    <input
                      type="range"
                      min={1}
                      max={MAX_ZOOM}
                      step={0.01}
                      value={view.zoom}
                      aria-label="Zoom de la foto"
                      onChange={(event) => setView((current) => ({ ...current, zoom: Number(event.target.value) }))}
                      className="h-2 flex-1 accent-white"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setView(DEFAULT_VIEW)}
                    className="h-10 rounded-full bg-white/8 text-[13px] text-white/75"
                  >
                    Centrar foto
                  </button>
                </>
              ) : (
                <p className="px-1 text-[13px] leading-5 text-white/50">
                  Elige una foto de tu galería. Luego arrástrala con el dedo y pellizca para hacer zoom.
                </p>
              )}
              <p className="px-1 text-[12px] leading-5 text-white/40">
                Para mover los datos, arrástralos sobre la imagen. Tu foto no sale de tu dispositivo.
              </p>
            </div>
          )}

          {shownTab === "datos" && (
            <Group title="Datos a mostrar">
              <div className="flex flex-wrap gap-2">
                {SHARE_FIELDS.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    aria-pressed={style.show[field.id]}
                    onClick={() => setShow(field.id)}
                    className={`h-10 rounded-full px-4 text-[14px] font-medium ${
                      style.show[field.id] ? "bg-white text-black" : "bg-white/8 text-white/60"
                    }`}
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            </Group>
          )}

          {shownTab === "letra" && (
            <div className="flex flex-col gap-4">
              <Group title="Tipografía">
                <div className="flex flex-wrap gap-2">
                  {FONT_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={style.font === id}
                      onClick={() => setStyle((current) => ({ ...current, font: id }))}
                      className={`h-11 rounded-2xl px-4 text-[16px] ${
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
              <label className="flex items-center gap-3 px-1 text-[13px] text-white/70">
                <span className="w-16 shrink-0">Tamaño</span>
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
            </div>
          )}

          {shownTab === "lugar" && (
            <div className="flex flex-col gap-4">
              <Group title="Posición de los datos">
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="Posición">
                  {POSITIONS.map((pos) => (
                    <button
                      key={pos.label}
                      type="button"
                      aria-label={`Datos ${pos.label}`}
                      aria-pressed={atPosition(pos)}
                      onClick={() => setStyle((current) => ({ ...current, x: pos.x, y: pos.y, align: pos.align }))}
                      className={`flex h-10 items-center rounded-xl px-3 ${
                        pos.align === "left" ? "justify-start" : pos.align === "center" ? "justify-center" : "justify-end"
                      } ${atPosition(pos) ? "bg-white" : "bg-white/8"}`}
                    >
                      <span className={`block h-1.5 w-5 rounded-full ${atPosition(pos) ? "bg-black" : "bg-white/50"}`} />
                    </button>
                  ))}
                </div>
              </Group>
              <Group title="Alineación del texto">
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
            </div>
          )}

          {shownTab === "estilo" && (
            <div className="flex flex-col gap-4">
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
              <Group title="Color de los datos">
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
              </Group>
              <button
                type="button"
                onClick={() => setStyle(normalizeStyle(DEFAULT_STYLE))}
                className="h-11 rounded-full bg-white/8 text-[14px] text-white/70"
              >
                Restablecer estilo
              </button>
            </div>
          )}
        </div>

        <nav
          aria-label="Herramientas"
          className="no-scrollbar flex overflow-x-auto px-2 py-1.5 md:order-1 md:border-b md:border-white/10 md:px-3 md:py-2"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={tab === item.id}
              onClick={() => {
                // En escritorio el panel está siempre abierto: no se pliega.
                const desktop = window.matchMedia("(min-width: 768px)").matches;
                setTab(!desktop && tab === item.id ? null : item.id);
              }}
              className={`h-12 min-w-[62px] flex-1 rounded-2xl px-2 text-[13px] font-medium ${
                tab === item.id
                  ? "bg-white/12 text-white"
                  : tab === null && item.id === "foto"
                    ? "text-white/55 md:bg-white/12 md:text-white"
                    : "text-white/55"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
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
        active ? "bg-white text-black" : "bg-white/8 text-white/80"
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
        active ? "bg-white/90 text-black" : "bg-white/8 text-white/75"
      }`}
    >
      {children}
    </button>
  );
}
