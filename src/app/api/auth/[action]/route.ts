import { db, databaseConfigured } from "@/lib/server/db";
import { createSession, destroySession } from "@/lib/server/session";
import { hashPassword, verifyPassword } from "@/lib/auth-crypto";
import {
  sameOrigin,
  readJson,
  HttpError,
  failure,
  json,
} from "@/lib/server/http";
import { throttle } from "@/lib/server/throttle";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    sameOrigin(request);
    const { action } = await context.params;
    if (!["login", "register", "logout"].includes(action))
      throw new HttpError(404, "Unknown account action.");
    if (action === "logout") {
      await destroySession();
      return json({ ok: true });
    }
    if (!databaseConfigured())
      throw new HttpError(
        503,
        "Account access is not configured yet. You can explore the demo.",
      );
    const input = await readJson(request);
    const email =
      typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      password.length < 8 ||
      Buffer.byteLength(password) > 1024 ||
      (action === "register" && (!name || name.length > 100))
    )
      throw new HttpError(
        400,
        "Enter a valid email, a password of 8–256 characters, and your name when registering.",
      );
    if (password.length > 256)
      throw new HttpError(400, "Password must be at most 256 characters.");
    // Vercel sets x-forwarded-for; email limits also apply regardless of proxy headers.
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    await throttle(`${action}:ip:${ip}`, 30);
    await throttle(`${action}:email:${email}`, 10);
    if (action === "register") {
      const passwordHash = await hashPassword(password);
      let user;
      try {
        user = await db().user.create({ data: { email, name, passwordHash } });
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "P2002"
        )
          throw new HttpError(
            409,
            "Unable to create this account. Try logging in or use another email.",
          );
        throw error;
      }
      await createSession(user.id);
      return json({ ok: true });
    }
    const user = await db().user.findUnique({ where: { email } });
    // Always run scrypt, including for unknown accounts, to limit timing leakage.
    const dummy = "scrypt:" + "0".repeat(32) + ":" + "0".repeat(128);
    const valid = await verifyPassword(password, user?.passwordHash || dummy);
    if (!user || !valid)
      throw new HttpError(401, "Email or password is incorrect.");
    await createSession(user.id);
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
