import "server-only";
import { db } from "@/lib/server/db";
import { sessionToken, tokenHash } from "@/lib/auth-crypto";
import { bearerToken, mobileRequestHeadersAllowed, MOBILE_SESSION_DURATION_MS } from "@/lib/mobile-auth";
import { HttpError } from "@/lib/server/http";

export function assertMobileRequest(request: Request) {
  if (!mobileRequestHeadersAllowed(request.headers.get("origin"), request.headers.get("cookie")))
    throw new HttpError(403, "Browser origins and cookies are not valid mobile authentication.");
}
export function requireMobileToken(request: Request): string {
  assertMobileRequest(request);
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) throw new HttpError(401, "Sign in to access your mobile workspace.");
  return token;
}
export async function mobileUser(request: Request) {
  const token = requireMobileToken(request);
  const session = await db().mobileSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date())
    throw new HttpError(401, "Your mobile session expired. Sign in again.");
  return session.user;
}
export async function issueMobileToken(userId: string) {
  const token = sessionToken();
  const expiresAt = new Date(Date.now() + MOBILE_SESSION_DURATION_MS);
  await db().mobileSession.create({
    data: { tokenHash: tokenHash(token), userId, expiresAt },
  });
  return { accessToken: token, tokenType: "Bearer", expiresAt: expiresAt.toISOString() };
}
export async function revokeMobileToken(request: Request) {
  const token = requireMobileToken(request);
  await db().mobileSession.deleteMany({ where: { tokenHash: tokenHash(token) } });
}
