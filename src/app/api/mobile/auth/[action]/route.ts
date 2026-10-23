import { db } from "@/lib/server/db";
import { hashPassword, verifyPassword } from "@/lib/auth-crypto";
import { assertMobileRequest, issueMobileToken, revokeMobileToken } from "@/lib/server/mobile-session";
import { throttle } from "@/lib/server/throttle";
import { readJson, HttpError, json, failure } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    assertMobileRequest(request);
    const { action } = await context.params;
    if (!["register", "login", "logout"].includes(action))
      throw new HttpError(404, "Unknown mobile account action.");
    if (action === "logout") {
      await revokeMobileToken(request);
      return json({ ok: true });
    }
    const input = await readJson(request);
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";
    const name = typeof input.name === "string" ? input.name.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254 || password.length < 8 ||
        password.length > 256 || Buffer.byteLength(password) > 1024 ||
        (action === "register" && (!name || name.length > 100)))
      throw new HttpError(400, "Enter a valid email, password of 8–256 characters, and name when registering.");
    const ip = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "local";
    await throttle(`mobile:${action}:ip:${ip}`, 30);
    await throttle(`mobile:${action}:email:${email}`, 10);
    let user;
    if (action === "register") {
      const passwordHash = await hashPassword(password);
      try {
        user = await db().user.create({ data: { email, name, passwordHash } });
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "P2002")
          throw new HttpError(409, "Unable to create this account. Try logging in instead.");
        throw error;
      }
    } else {
      user = await db().user.findUnique({ where: { email } });
      const dummy = "scrypt:" + "0".repeat(32) + ":" + "0".repeat(128);
      const valid = await verifyPassword(password, user?.passwordHash || dummy);
      if (!user || !valid) throw new HttpError(401, "Email or password is incorrect.");
    }
    const token = await issueMobileToken(user.id);
    return json({ user: { email: user.email, name: user.name }, ...token });
  } catch (error) {
    return failure(error, "mobile.auth");
  }
}
