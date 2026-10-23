/** Pure request-header policy; separate from browser cookie authentication. */
export function bearerToken(header: string | null): string | null {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(header ?? "");
  return match?.[1] ?? null;
}
export function mobileRequestHeadersAllowed(origin: string | null, cookie: string | null) {
  return origin === null && cookie === null;
}
export const MOBILE_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
