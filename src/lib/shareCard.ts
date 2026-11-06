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

export type ShareCardData = {
  /** Nombre del atleta. */
  name: string;
  /** "Oro" / "Mr Olympia". */
  rankName: string;
  /** "II" o "" en el rango máximo. */
  division: string;
  points: number;
  icon: string;
  color: string;
  glow: string;
  /** Línea de marca: "Press banca · 100 kg". */
  mark: string;
  /** "SENTADILLA" o "RANGO GENERAL". */
  scope: string;
  /** "Top 12 %". */
  topLabel: string;
  /** 0–1: avance hacia el siguiente rango (anillo del escudo). */
  progress: number;
  photo: SharePhoto | null;
  view: PhotoView;
  /** Emblema del rango ya cargado; si falta se dibuja el emoji. */
  badge?: CanvasImageSource | null;
  /** Nombre del siguiente rango (null en la cima). */
  nextName?: string | null;
};

export const BRAND = "RANKEDGG";
const FONT = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
const EMOJI_FONT = `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;

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

/** Reduce el tamaño de fuente hasta que el texto quepa en maxWidth. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  maxSize: number,
  minSize: number,
  maxWidth: number,
) {
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  ctx.font = `${weight} ${size}px ${FONT}`;
  return size;
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
    base.addColorStop(0, "#0b0e18");
    base.addColorStop(1, "#05060a");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, w * 0.95);
    glow.addColorStop(0, data.glow);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }

  // Oscurece arriba y abajo para que el texto se lea sobre cualquier foto.
  const top = ctx.createLinearGradient(0, 0, 0, h * 0.2);
  top.addColorStop(0, "rgba(0,0,0,0.7)");
  top.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h * 0.2);

  const bottom = ctx.createLinearGradient(0, h * 0.38, 0, h);
  bottom.addColorStop(0, "rgba(0,0,0,0)");
  bottom.addColorStop(0.55, "rgba(0,0,0,0.78)");
  bottom.addColorStop(1, "rgba(0,0,0,0.95)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, h * 0.38, w, h * 0.62);

  const tint = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, w * 0.9);
  tint.addColorStop(0, data.glow);
  tint.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = tint;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);
}

/** Marca de agua diagonal repetida, muy tenue: cubre la foto aunque la recorten. */
function drawTiledWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 7);
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.font = `800 64px ${FONT}`;
  setSpacing(ctx, 14);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const label = BRAND;
  const stepX = 520;
  const stepY = 360;
  const reach = Math.hypot(w, h);
  let row = 0;
  for (let y = -reach / 2; y < reach / 2; y += stepY) {
    const shift = row % 2 === 0 ? 0 : stepX / 2;
    for (let x = -reach / 2 - stepX; x < reach / 2; x += stepX) {
      ctx.fillText(label, x + shift, y);
    }
    row += 1;
  }
  ctx.restore();
}

function drawBrand(ctx: CanvasRenderingContext2D, w: number, data: ShareCardData) {
  const x = 64;
  const y = 64;
  // Logo: cuadrado redondeado con la inicial.
  roundedRect(ctx, x, y, 84, 84, 24);
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fill();
  ctx.fillStyle = "#05060a";
  ctx.font = `900 56px ${FONT}`;
  setSpacing(ctx, 0);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("R", x + 42, y + 46);

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 46px ${FONT}`;
  setSpacing(ctx, 8);
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 14;
  ctx.fillText(BRAND, x + 108, y + 44);
  ctx.shadowBlur = 0;

  // Alcance de la tarjeta, arriba a la derecha.
  ctx.textAlign = "right";
  ctx.fillStyle = data.color;
  ctx.font = `700 32px ${FONT}`;
  setSpacing(ctx, 5);
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 12;
  ctx.fillText(data.scope.toUpperCase(), w - 64, y + 44);
  ctx.shadowBlur = 0;
  setSpacing(ctx, 0);
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  data: ShareCardData,
) {
  ctx.save();
  ctx.shadowColor = data.glow;
  ctx.shadowBlur = 70;
  if (data.badge) {
    ctx.drawImage(data.badge, cx - size / 2, cy - size / 2, size, size);
  } else {
    ctx.font = `${size * 0.7}px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(data.icon, cx, cy);
  }
  ctx.restore();
}

export function drawShareCard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  data: ShareCardData,
) {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h, data);
  drawTiledWatermark(ctx, w, h);
  drawBrand(ctx, w, data);

  const pad = 72;
  const innerW = w - pad * 2;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 24;

  // De abajo hacia arriba.
  let y = h - 74;

  // Barra inferior: percentil y marca de agua.
  ctx.font = `700 34px ${FONT}`;
  setSpacing(ctx, 6);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.textAlign = "left";
  ctx.fillText(BRAND, pad, y);
  ctx.textAlign = "right";
  ctx.fillStyle = data.color;
  setSpacing(ctx, 2);
  ctx.fillText(data.topLabel, w - pad, y);
  y -= 34;

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(pad, y, innerW, 3);
  y -= 52;
  ctx.shadowBlur = 24;

  // Marca: ejercicio y kilos.
  ctx.textAlign = "left";
  setSpacing(ctx, 0);
  fitFont(ctx, data.mark, 600, 58, 32, innerW);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(data.mark, pad, y);
  y -= 78;

  // División y puntos.
  if (data.division) {
    const label = `DIVISIÓN ${data.division}  ·  ${data.points} PTS`;
    ctx.font = `800 36px ${FONT}`;
    setSpacing(ctx, 5);
    const textW = ctx.measureText(label).width;
    const pillW = textW + 64;
    ctx.shadowBlur = 0;
    roundedRect(ctx, pad, y - 52, pillW, 72, 36);
    ctx.fillStyle = data.color;
    ctx.fill();
    ctx.fillStyle = "#05060a";
    ctx.textBaseline = "middle";
    ctx.fillText(label, pad + 32, y - 15);
    ctx.textBaseline = "alphabetic";
    ctx.shadowBlur = 24;
    setSpacing(ctx, 0);
    y -= 112;
  } else {
    y -= 20;
  }

  // Rango en grande.
  const rankText = data.rankName.toUpperCase();
  setSpacing(ctx, 0);
  const rankSize = fitFont(ctx, rankText, 900, 230, 90, innerW);
  ctx.shadowColor = data.glow;
  ctx.shadowBlur = 50;
  ctx.fillStyle = data.color;
  ctx.fillText(rankText, pad, y);
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 24;
  y -= rankSize * 0.86;

  // Nombre.
  ctx.fillStyle = "#ffffff";
  setSpacing(ctx, 3);
  fitFont(ctx, data.name.toUpperCase(), 800, 104, 48, innerW);
  ctx.fillText(data.name.toUpperCase(), pad, y);
  const nameSize = parseInt(ctx.font.match(/(\d+)px/)?.[1] ?? "100", 10);
  y -= nameSize + 36;

  // Emblema del rango sobre el nombre, con el avance al siguiente rango al lado.
  const badgeSize = Math.min(340, Math.max(200, y - 150));
  const badgeCy = y - badgeSize / 2;
  ctx.shadowBlur = 0;
  drawBadge(ctx, pad + badgeSize / 2, badgeCy, badgeSize, data);

  const barX = pad + badgeSize + 36;
  const barW = w - pad - barX;
  if (barW > 160) {
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    setSpacing(ctx, 4);
    ctx.font = `700 28px ${FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 16;
    ctx.fillText(data.nextName ? `HACIA ${data.nextName.toUpperCase()}` : "CIMA ABSOLUTA", barX, badgeCy - 14);
    ctx.shadowBlur = 0;
    roundedRect(ctx, barX, badgeCy + 8, barW, 20, 10);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fill();
    const fillW = Math.max(20, barW * clamp(data.progress, 0, 1));
    roundedRect(ctx, barX, badgeCy + 8, fillW, 20, 10);
    ctx.fillStyle = data.color;
    ctx.fill();
    setSpacing(ctx, 0);
    ctx.font = `700 30px ${FONT}`;
    ctx.fillStyle = "#fff";
    ctx.fillText(`${Math.round(clamp(data.progress, 0, 1) * 100)}%`, barX, badgeCy + 70);
  }

  ctx.restore();
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
