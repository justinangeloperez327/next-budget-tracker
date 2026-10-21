export type SaveOutcome =
  | { kind: "saved"; revision: number }
  | { kind: "rejected"; message: string; reloadRequired: boolean };

function apiError(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("error" in body)) return;
  const error = body.error;
  return typeof error === "string" && error.trim() ? error : undefined;
}

/**
 * Only a valid, incremented revision confirms a save. A failed or ambiguous
 * response never advances the local revision or updates the visible snapshot.
 */
export function interpretSaveResponse(
  status: number,
  body: unknown,
  expectedRevision: number,
): SaveOutcome {
  if (status >= 200 && status < 300) {
    const revision =
      body && typeof body === "object" && "revision" in body
        ? body.revision
        : undefined;
    if (
      Number.isSafeInteger(revision) &&
      revision === expectedRevision + 1
    ) {
      return { kind: "saved", revision: revision as number };
    }
    return {
      kind: "rejected",
      message: "The save could not be confirmed. Reload before editing again.",
      reloadRequired: true,
    };
  }

  if (status === 409)
    return {
      kind: "rejected",
      message:
        "Your workspace changed in another tab or device. Reload before saving more changes. Unsaved form entries may be lost on reload.",
      reloadRequired: true,
    };
  if (status === 401 || status === 403)
    return {
      kind: "rejected",
      message:
        "Your session is no longer authorized to save. Reload and log in again if requested.",
      reloadRequired: true,
    };
  if ([400, 413, 415, 429].includes(status))
    return {
      kind: "rejected",
      message: apiError(body) ?? "This change could not be saved. Check your input and try again.",
      reloadRequired: false,
    };
  return {
    kind: "rejected",
    message:
      apiError(body) ??
      "The save service is temporarily unavailable. You can retry this edit.",
    reloadRequired: false,
  };
}
