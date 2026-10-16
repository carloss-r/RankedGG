/**
 * Nombre completo (privado, solo visible para su dueño y la consola de Firebase)
 * y nombre público (el que aparece en el ranking).
 *
 * Cambia PUBLIC_NAME_MODE a "full" si quieres mostrar el nombre completo en el ranking.
 */
export const PUBLIC_NAME_MODE: "short" | "full" = "short";

export const FULL_NAME_MAX = 80;

// Letras (con acentos), apóstrofos, puntos y guiones; construido con RegExp para no depender del target de TS.
const NAME_RE = new RegExp("^[\\p{L}][\\p{L}'.\\- ]*$", "u");

export function normalizeFullName(raw: string) {
  return raw.replace(/\s+/g, " ").trim();
}

/** Devuelve un código de error o null si el nombre es válido. */
export function validateFullName(raw: string): "name_too_short" | "name_too_long" | "name_invalid" | null {
  const name = normalizeFullName(raw);
  const parts = name.split(" ");
  if (name.length > FULL_NAME_MAX) return "name_too_long";
  if (parts.length < 2 || parts.some((part) => part.replace(/[^\p{L}]/gu, "").length < 2)) {
    return "name_too_short";
  }
  if (!NAME_RE.test(name)) return "name_invalid";
  return null;
}

export function nameErrorMessage(code: string | null) {
  switch (code) {
    case "name_too_short":
      return "Escribe tu nombre completo: nombre y al menos un apellido.";
    case "name_too_long":
      return `Máximo ${FULL_NAME_MAX} caracteres.`;
    case "name_invalid":
      return "Usa solo letras, espacios, apóstrofos, puntos o guiones.";
    default:
      return "";
  }
}

/**
 * "Carlos Rangel Pérez" -> "Carlos R."; "Ana Pérez" -> "Ana P.".
 * Con 3+ palabras usa la penúltima como primer apellido.
 */
export function publicName(fullName: string, mode: "short" | "full" = PUBLIC_NAME_MODE) {
  const name = normalizeFullName(fullName);
  if (mode === "full") return name.slice(0, 40);
  const parts = name.split(" ");
  if (parts.length < 2) return name.slice(0, 24);
  const first = parts[0];
  const surname = parts.length === 2 ? parts[1] : parts[parts.length - 2];
  return `${first} ${surname.charAt(0).toUpperCase()}.`.slice(0, 24);
}
