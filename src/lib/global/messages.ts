import { nameErrorMessage } from "./names";

/** Mensaje legible para un código de GlobalError. */
export function errorMessage(code?: string) {
  switch (code) {
    case "auth_disabled":
      return "Falta activar el acceso anónimo en Firebase Authentication.";
    case "permission_denied":
      return "Firebase rechazó la operación. Revisa que las reglas de la base estén publicadas.";
    case "not_registered":
      return "Tu registro no está en la base de datos. Vuelve a registrarte para aparecer en el ranking.";
    case "register_failed":
      return "No se pudo confirmar tu registro en la base. Intenta de nuevo.";
    case "name_too_short":
    case "name_too_long":
    case "name_invalid":
      return nameErrorMessage(code);
    case "no_marks":
      return "Registra al menos una marca para aparecer en el ranking.";
    case "implausible_mark":
      return "Una de tus marcas parece fuera de rango para tu peso. Revísala.";
    case "unknown_scope":
      return "Ese ranking no existe.";
    case "network":
      return "Sin conexión. Se reintentará cuando cambies una marca.";
    default:
      return "No se pudo conectar con el ranking.";
  }
}
