import { rankBadgeSvg } from "../lib/badges";
import type { RankId } from "../lib/types";

/** Emblema SVG de un rango. `locked` lo apaga (rango aún no alcanzado). */
export function RankBadge({
  rankId,
  size = 48,
  locked = false,
  glow,
  className = "",
}: {
  rankId: RankId;
  size?: number;
  locked?: boolean;
  glow?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        filter: locked
          ? "grayscale(1) brightness(.8)"
          : glow
            ? `drop-shadow(0 0 ${Math.round(size / 6)}px ${glow})`
            : undefined,
        opacity: locked ? 0.55 : 1,
      }}
      // Contenido generado por nuestro propio código (lib/badges), sin datos del usuario.
      dangerouslySetInnerHTML={{ __html: rankBadgeSvg(rankId) }}
    />
  );
}
