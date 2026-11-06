/**
 * Dibuja la tarjeta de rango en un canvas para exportarla como PNG.
 * Solo usa APIs del navegador; no depende de React.
 */

export type ShareFormat = "story" | "post";

export const SHARE_SIZES: Record<ShareFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1350 },
};

export type SharePhoto = {
  source: CanvasImageSource;
  width: number;
  height: number;
};

export type PhotoView = {
  /** 1 = la foto cubre justo el lienzo. */
  zoom: number;
  /** -1…1: posición dentro del margen que deja el zoom. */
  panX: number;
  panY: number;
};

/** Datos que se pueden mostrar u ocultar en la tarjeta. */
export type ShareField = "badge" | "name" | "scope" | "rank" | "mark" | "points" | "top" | "progress";

export const SHARE_FIELDS: { id: ShareField; label: string }[] = [
  { id: "badge", label: "Emblema" },
  { id: "name", label: "Nombre" },
  { id: "scope", label: "Ejercicio" },
  { id: "rank", label: "Rango" },
  { id: "mark", label: "Marca" },
  { id: "points", label: "Puntos" },
  { id: "top", label: "Percentil" },
  { id: "progress", label: "Progreso" },
];

export type FontId = "modern" | "thin" | "condensed" | "serif" | "mono" | "rounded" | "italic";

type FontSpec = {
  label: string;
  family: string;
  valueWeight: number;
  labelWeight: number;
  italic?: boolean;
  /** Espaciado de letras de los valores grandes (px a escala 1). */
  valueTracking: number;
};

/** Tipografías del sistema (sin descargas): cada dispositivo usa la más parecida que tenga. */
export const FONTS: Record<FontId, FontSpec> = {
  modern: {
    label: "Moderna",
    family: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    valueWeight: 700,
    labelWeight: 500,
    valueTracking: -1,
  },
  thin: {
    label: "Fina",
    family: `ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", "Segoe UI", Roboto, Arial, sans-serif`,
    valueWeight: 200,
    labelWeight: 300,
    valueTracking: 2,
  },
  condensed: {
    label: "Condensada",
    family: `"Avenir Next Condensed", "Arial Narrow", "Roboto Condensed", "sans-serif-condensed", "Helvetica Neue Condensed", Impact, sans-serif`,
    valueWeight: 700,
    labelWeight: 500,
    valueTracking: 0,
  },
  serif: {
    label: "Serif",
    family: `"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif`,
    valueWeight: 600,
    labelWeight: 400,
    valueTracking: 0,
  },
  mono: {
    label: "Mono",
    family: `ui-monospace, "SF Mono", Menlo, Consolas, "Roboto Mono", "Courier New", monospace`,
    valueWeight: 600,
    labelWeight: 400,
    valueTracking: -2,
  },
  rounded: {
    label: "Redondeada",
    family: `ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Varela Round", Nunito, system-ui, sans-serif`,
    valueWeight: 700,
    labelWeight: 600,
    valueTracking: 0,
  },
  italic: {
    label: "Cursiva",
    family: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
    valueWeight: 800,
    labelWeight: 600,
    italic: true,
    valueTracking: -1,
  },
};

export const FONT_IDS = Object.keys(FONTS) as FontId[];

export type Align = "left" | "center" | "right";

export type ShareStyle = {
  font: FontId;
  align: Align;
  /** Centro del bloque de datos, 0–1 del lienzo (se ajusta para no salirse de los márgenes). */
  x: number;
  y: number;
  /** Tamaño de los datos: 0.7–1.5. */
  scale: number;
  /** Oscurecido de la foto: 0–0.8. */
  dim: number;
  colorMode: "rank" | "white";
  show: Record<ShareField, boolean>;
};

export const DEFAULT_STYLE: ShareStyle = {
  font: "modern",
  align: "left",
  x: 0,
  y: 1,
  scale: 1,
  dim: 0.38,
  colorMode: "rank",
  show: {
    badge: true,
    name: true,
    scope: true,
    rank: true,
    mark: true,
    points: false,
    top: true,
    progress: false,
  },
};

/** Valida un estilo guardado (localStorage) y rellena lo que falte. */
export function normalizeStyle(raw: unknown): ShareStyle {
  const base: ShareStyle = { ...DEFAULT_STYLE, show: { ...DEFAULT_STYLE.show } };
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<ShareStyle>;
  const num = (v: unknown, min: number, max: number, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  if (typeof r.font === "string" && r.font in FONTS) base.font = r.font as FontId;
  if (r.align === "left" || r.align === "center" || r.align === "right") base.align = r.align;
  base.x = num(r.x, 0, 1, base.x);
  base.y = num(r.y, 0, 1, base.y);
  base.scale = num(r.scale, 0.7, 1.5, base.scale);
  base.dim = num(r.dim, 0, 0.8, base.dim);
  if (r.colorMode === "rank" || r.colorMode === "white") base.colorMode = r.colorMode;
  if (r.show && typeof r.show === "object") {
    for (const field of SHARE_FIELDS) {
      const v = (r.show as Record<string, unknown>)[field.id];
      if (typeof v === "boolean") base.show[field.id] = v;
    }
  }
  return base;
}

export type ShareCardData = {
  /** Nombre del atleta. */
  name: string;
  /** "Oro" / "Mr Olympia". */
  rankName: string;
  /** "II" o "" en el rango máximo. */
  division: string;
  points: number;
  color: string;
  glow: string;
  /** Texto de la marca y su etiqueta: "185 kg" / "1RM ESTIMADO". */
  markValue: string;
  markLabel: string;
  /** "SENTADILLA" o "RANGO GENERAL". */
  scope: string;
  /** "TOP 33%". */
  topLabel: string;
  /** 0–1: avance hacia el siguiente rango. */
  progress: number;
  photo: SharePhoto | null;
  view: PhotoView;
  style: ShareStyle;
  /** Emblema del rango ya cargado. */
  badge?: CanvasImageSource | null;
  /** Nombre del siguiente rango (null en la cima). */
  nextName?: string | null;
};

/** Zona ocupada por el bloque de datos (en píxeles del lienzo). */
export type BlockRect = { x: number; y: number; w: number; h: number };

export const BRAND = "RANKEDGG";
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  // letterSpacing existe en Chrome/Safari recientes; si falta, se ignora.
  (ctx as unknown as { letterSpacing?: string }).letterSpacing = `${px}px`;
}

/** Posición y tamaño de la foto al cubrir el lienzo con el zoom y desplazamiento dados. */
export function photoRect(
  photo: { width: number; height: number },
  canvasW: number,
  canvasH: number,
  view: PhotoView,
) {
  const cover = Math.max(canvasW / photo.width, canvasH / photo.height);
  const scale = cover * clamp(view.zoom, 1, 4);
  const w = photo.width * scale;
  const h = photo.height * scale;
  const slackX = (w - canvasW) / 2;
  const slackY = (h - canvasH) / 2;
  return {
    x: -slackX + clamp(view.panX, -1, 1) * slackX,
    y: -slackY + clamp(view.panY, -1, 1) * slackY,
    w,
    h,
  };
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: ShareCardData,
) {
  ctx.fillStyle = "#05060a";
  ctx.fillRect(0, 0, w, h);

  if (data.photo) {
    const rect = photoRect(data.photo, w, h, data.view);
    ctx.drawImage(data.photo.source, rect.x, rect.y, rect.w, rect.h);
  } else {
    const base = ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, "#0d1019");
    base.addColorStop(1, "#05060a");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w * 0.75, h * 0.25, 0, w * 0.75, h * 0.25, w * 0.9);
    glow.addColorStop(0, data.glow);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  // Oscurecido uniforme (lo elige el usuario) + degradado suave para que se lea el texto.
  if (data.style.dim > 0) {
    ctx.fillStyle = `rgba(0,0,0,${data.style.dim})`;
    ctx.fillRect(0, 0, w, h);
  }
  const bottom = ctx.createLinearGradient(0, h * 0.55, 0, h);
  bottom.addColorStop(0, "rgba(0,0,0,0)");
  bottom.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
}

/** Marca de agua fija y discreta: logo + nombre, abajo al centro. */
function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number, font: FontSpec) {
  const size = 44;
  setSpacing(ctx, 9);
  ctx.font = `700 30px ${font.family}`;
  const textW = ctx.measureText(BRAND).width;
  const total = size + 20 + textW;
  const x = (w - total) / 2;
  const y = h - 78;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 16;
  roundedRect(ctx, x, y - size / 2, size, size, 13);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#05060a";
  ctx.font = `900 30px ${font.family}`;
  setSpacing(ctx, 0);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("R", x + size / 2, y + 2);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `700 30px ${font.family}`;
  setSpacing(ctx, 9);
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 14;
  ctx.fillText(BRAND, x + size + 20, y + 2);
  ctx.restore();
  setSpacing(ctx, 0);
}

type Row = {
  w: number;
  h: number;
  /** Espacio que se deja debajo de la fila. */
  gap: number;
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
};

/** Dibuja la tarjeta y devuelve la zona que ocupan los datos (para poder arrastrarlos). */
export function drawShareCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: ShareCardData,
): BlockRect | null {
  const style = data.style;
  const font = FONTS[style.font];
  const s = style.scale * (w / 1080);
  const ink = style.colorMode === "rank" ? data.color : "#ffffff";

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h, data);

  const margin = 84 * (w / 1080);
  const maxW = w - margin * 2;
  const italic = font.italic ? "italic " : "";
  const valueFont = (size: number) => `${italic}${font.valueWeight} ${size}px ${font.family}`;
  const labelFont = (size: number) => `${italic}${font.labelWeight} ${size}px ${font.family}`;

  const rows: Row[] = [];
  const shadowed = (fn: () => void) => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 22;
    fn();
    ctx.restore();
  };

  // Mide un texto con la fuente y el espaciado dados.
  const measure = (text: string, font_: string, tracking: number) => {
    ctx.font = font_;
    setSpacing(ctx, tracking);
    const width = ctx.measureText(text).width;
    setSpacing(ctx, 0);
    return width;
  };

  // Dentro de una fila, el texto sigue la alineación elegida (izquierda, centro o derecha).
  const anchor = (x: number, rowW: number) =>
    style.align === "left" ? x : style.align === "center" ? x + rowW / 2 : x + rowW;

  const alignedX = (x: number, rowW: number, blockW: number, align: Align) =>
    align === "left" ? x : align === "center" ? x + (blockW - rowW) / 2 : x + blockW - rowW;

  // Emblema.
  if (style.show.badge && data.badge) {
    const size = 168 * s;
    rows.push({
      w: size,
      h: size,
      gap: 30 * s,
      draw: (c, x, y) => {
        c.save();
        c.shadowColor = data.glow;
        c.shadowBlur = 40;
        c.drawImage(data.badge as CanvasImageSource, x, y, size, size);
        c.restore();
      },
    });
  }

  // Nombre.
  if (style.show.name && data.name.trim()) {
    const text = data.name.toUpperCase();
    let size = 44 * s;
    while (size > 18 && measure(text, labelFont(size), 9 * s) > maxW) size -= 2;
    const tw = measure(text, labelFont(size), 9 * s);
    rows.push({
      w: tw,
      h: size,
      gap: 14 * s,
      draw: (c, x, y) => {
        shadowed(() => {
          c.font = labelFont(size);
          setSpacing(c, 9 * s);
          c.fillStyle = "rgba(255,255,255,0.95)";
          c.textAlign = style.align;
          c.textBaseline = "top";
          c.fillText(text, anchor(x, tw), y);
          setSpacing(c, 0);
        });
      },
    });
  }

  // Ejercicio / alcance.
  if (style.show.scope) {
    const text = data.scope.toUpperCase();
    const size = 28 * s;
    const tw = measure(text, labelFont(size), 8 * s);
    rows.push({
      w: tw,
      h: size,
      gap: 46 * s,
      draw: (c, x, y) => {
        shadowed(() => {
          c.font = labelFont(size);
          setSpacing(c, 8 * s);
          c.fillStyle = ink;
          c.textAlign = style.align;
          c.textBaseline = "top";
          c.fillText(text, anchor(x, tw), y);
          setSpacing(c, 0);
        });
      },
    });
  }

  // Datos grandes con su etiqueta pequeña debajo.
  const stat = (value: string, label: string, big: boolean, colored: boolean) => {
    let size = (big ? 138 : 98) * s;
    const track = font.valueTracking * s;
    while (size > 36 && measure(value, valueFont(size), track) > maxW) size -= 4;
    const vw = measure(value, valueFont(size), track);
    const labelSize = 26 * s;
    const lw = measure(label, labelFont(labelSize), 7 * s);
    const rowW = Math.max(vw, lw);
    rows.push({
      w: rowW,
      h: size * 0.78 + 14 * s + labelSize,
      gap: 40 * s,
      draw: (c, x, y) => {
        shadowed(() => {
          c.textBaseline = "top";
          c.textAlign = style.align;
          c.font = valueFont(size);
          setSpacing(c, track);
          c.fillStyle = colored ? ink : "#ffffff";
          c.fillText(value, anchor(x, rowW), y - size * 0.1);
          setSpacing(c, 0);
          c.font = labelFont(labelSize);
          setSpacing(c, 7 * s);
          c.fillStyle = "rgba(255,255,255,0.68)";
          c.fillText(label, anchor(x, rowW), y + size * 0.78 + 14 * s);
          setSpacing(c, 0);
        });
      },
    });
  };

  if (style.show.rank) {
    stat(
      data.rankName.toUpperCase(),
      data.division ? `RANGO · DIVISIÓN ${data.division}` : "RANGO MÁXIMO",
      true,
      true,
    );
  }
  if (style.show.mark) stat(data.markValue, data.markLabel, false, false);
  if (style.show.points) stat(`${data.points}`, "PUNTOS DE DIVISIÓN", false, false);
  if (style.show.top) stat(data.topLabel, "COMPARACIÓN MUNDIAL", false, false);

  if (style.show.progress) {
    const barW = Math.min(maxW, 520 * s);
    const labelSize = 26 * s;
    const label = `${Math.round(clamp(data.progress, 0, 1) * 100)}%  ·  ${
      data.nextName ? `HACIA ${data.nextName.toUpperCase()}` : "CIMA ABSOLUTA"
    }`;
    const lw = measure(label, labelFont(labelSize), 6 * s);
    const rowW = Math.max(barW, lw);
    rows.push({
      w: rowW,
      h: 8 * s + 16 * s + labelSize,
      gap: 40 * s,
      draw: (c, x, y) => {
        shadowed(() => {
          const barX = alignedX(x, barW, rowW, style.align);
          roundedRect(c, barX, y, barW, 8 * s, 4 * s);
          c.fillStyle = "rgba(255,255,255,0.25)";
          c.fill();
          roundedRect(c, barX, y, Math.max(8 * s, barW * clamp(data.progress, 0, 1)), 8 * s, 4 * s);
          c.fillStyle = ink;
          c.fill();
          c.font = labelFont(labelSize);
          setSpacing(c, 6 * s);
          c.fillStyle = "rgba(255,255,255,0.68)";
          c.textAlign = style.align;
          c.textBaseline = "top";
          c.fillText(label, anchor(x, rowW), y + 8 * s + 16 * s);
          setSpacing(c, 0);
        });
      },
    });
  }

  let rect: BlockRect | null = null;
  if (rows.length > 0) {
    const blockW = Math.min(maxW, Math.max(...rows.map((row) => row.w)));
    const blockH = rows.reduce((sum, row, index) => sum + row.h + (index < rows.length - 1 ? row.gap : 0), 0);

    const top = 90 * (w / 1080);
    const bottom = h - 170 * (w / 1080); // deja libre la marca de agua
    const bx = clamp(style.x * w - blockW / 2, margin, w - margin - blockW);
    const by =
      blockH >= bottom - top ? top : clamp(style.y * h - blockH / 2, top, bottom - blockH);

    let y = by;
    rows.forEach((row, index) => {
      row.draw(ctx, alignedX(bx, row.w, blockW, style.align), y);
      y += row.h + (index < rows.length - 1 ? row.gap : 0);
    });
    rect = { x: bx, y: by, w: blockW, h: blockH };
  }

  drawWatermark(ctx, w, h, font);
  ctx.restore();
  return rect;
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo generar la imagen."));
    }, "image/png");
  });
}

const MAX_PHOTO_SIDE = 2400;

/** Carga una foto de la galería respetando la orientación EXIF y limitando su tamaño. */
export async function loadPhoto(file: File): Promise<SharePhoto> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Elige una imagen (JPG, PNG, HEIC o WebP).");
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = null;
  }

  if (!bitmap) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return downscale(img, img.naturalWidth, img.naturalHeight);
    } catch {
      throw new Error("No se pudo leer esa imagen. Prueba con otra foto.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const photo = downscale(bitmap, bitmap.width, bitmap.height);
  if (photo.source !== bitmap) bitmap.close();
  return photo;
}

function downscale(source: CanvasImageSource, width: number, height: number): SharePhoto {
  if (!width || !height) throw new Error("La imagen está vacía.");
  const ratio = Math.min(1, MAX_PHOTO_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no puede procesar imágenes.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { source: canvas, width: canvas.width, height: canvas.height };
}
