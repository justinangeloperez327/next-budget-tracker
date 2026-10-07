import "server-only";
import { db } from "@/lib/server/db";
import { tokenHash } from "@/lib/auth-crypto";
import { HttpError } from "@/lib/server/http";
export async function throttle(key: string, limit: number) {
  const hashed = tokenHash(key);
  await db().authAttempt.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 86400000) } },
  });
  const rows = await db().$queryRaw<{ count: number }[]>`
    INSERT INTO "AuthAttempt" ("key", "count", "expiresAt") VALUES (${hashed}, 1, NOW() + INTERVAL '15 minutes')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AuthAttempt"."expiresAt" <= NOW() THEN 1 ELSE "AuthAttempt"."count" + 1 END,
      "expiresAt" = CASE WHEN "AuthAttempt"."expiresAt" <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE "AuthAttempt"."expiresAt" END
    RETURNING "count"`;
  if (rows[0].count > limit)
    throw new HttpError(
      429,
      "Too many attempts. Please wait 15 minutes and try again.",
    );
}
