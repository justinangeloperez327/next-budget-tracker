import "server-only";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(request.url);
  // Next.js can construct request.url with its internal hostname. The browser
  // sends Host for the actual public origin; it cannot override this header.
  const host = request.headers.get("host");
  if (host) expected.host = host;
  if (!origin || origin !== expected.origin)
    throw new HttpError(403, "Request origin is not allowed.");
}
export async function readJson(
  request: Request,
  maxBytes = 16000,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "Send JSON data.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request data is required.");
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "Too much data in one request.");
    }
    chunks.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error();
    return value;
  } catch {
    throw new HttpError(400, "Invalid request data.");
  }
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  const details =
    error && typeof error === "object"
      ? {
          name: error instanceof Error ? error.name : "UnknownError",
          code:
            "code" in error && typeof error.code === "string"
              ? error.code
              : undefined,
          message:
            error instanceof Error
              ? error.message.split("\n", 1)[0]
              : undefined,
        }
      : { name: "UnknownError" };
  console.error("Budget API request failed", details);
  return Response.json(
    { error: "We couldn’t access your account data. Please try again shortly." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
export function json(data: unknown) {
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
