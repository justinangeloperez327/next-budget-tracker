import "server-only";
import { cookies } from "next/headers";
import { db, databaseConfigured } from "@/lib/server/db";
import { sessionToken, tokenHash } from "@/lib/auth-crypto";
const COOKIE = "budget-session";
const TTL = 60 * 60 * 24 * 7;
export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  if (!databaseConfigured()) throw new Error("Database unavailable");
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await db().session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: true },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
}
export async function createSession(userId: string) {
  const store = await cookies();
  const previous = store.get(COOKIE)?.value;
  const token = sessionToken();
  await db().$transaction(async (tx) => {
    if (previous)
      await tx.session.deleteMany({
        where: { tokenHash: tokenHash(previous) },
      });
    await tx.session.deleteMany({
      where: { userId, expiresAt: { lte: new Date() } },
    });
    await tx.session.create({
      data: {
        tokenHash: tokenHash(token),
        userId,
        expiresAt: new Date(Date.now() + TTL * 1000),
      },
    });
  });
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL,
  });
}
export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token)
    await db().session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  store.delete(COOKIE);
}
