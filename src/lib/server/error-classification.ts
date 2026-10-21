/** Deliberately avoid exposing database or SQL exception details to clients. */
const transientDatabaseCodes = new Set([
  "P1000", // authentication to the database failed
  "P1001", // unreachable server
  "P1002", // connection timeout
  "P1008", // operation timeout
  "P1017", // connection closed
  "P2024", // connection pool exhausted
  "P2028", // transaction failed or timed out
  "P2034", // transaction conflict / deadlock
]);

export function classifyUnexpectedFailure(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined;
  if (
    (error instanceof Error && error.message === "Database unavailable") ||
    (code !== undefined && transientDatabaseCodes.has(code))
  )
    return {
      status: 503,
      code: "DATA_SERVICE_UNAVAILABLE",
      message: "The account data service is temporarily unavailable. Please try again.",
    } as const;
  return {
    status: 500,
    code: "UNEXPECTED_ERROR",
    message: "We couldn't complete this request. Please try again.",
  } as const;
}
