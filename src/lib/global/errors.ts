/** Error con código estable para mostrar un mensaje en la UI. */
export class GlobalError extends Error {
  constructor(
    public code: string,
    public detail?: string,
  ) {
    super(code);
  }
}

/** Traduce errores del SDK de Firebase a códigos propios. */
export function toGlobalError(err: unknown): GlobalError {
  if (err instanceof GlobalError) return err;
  const code = (err as { code?: string } | null)?.code ?? "";
  const message = (err as { message?: string } | null)?.message ?? "";

  if (code === "auth/operation-not-allowed" || code === "auth/admin-restricted-operation") {
    return new GlobalError("auth_disabled");
  }
  if (code === "auth/network-request-failed" || code === "unavailable") {
    return new GlobalError("network");
  }
  if (code.startsWith("auth/")) return new GlobalError("auth_failed", code);
  if (/permission[_ ]denied/i.test(code) || /permission[_ ]denied/i.test(message)) {
    return new GlobalError("permission_denied");
  }
  if (/network|offline|failed to fetch/i.test(message)) return new GlobalError("network");
  return new GlobalError("request_failed");
}
