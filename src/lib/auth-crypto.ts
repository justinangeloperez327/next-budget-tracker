import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";

const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCallback(password, salt, 64, options, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt);
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, hash] = encoded.split(":");
  if (
    algorithm !== "scrypt" ||
    !/^[a-f0-9]{32}$/.test(salt || "") ||
    !/^[a-f0-9]{128}$/.test(hash || "")
  )
    return false;
  const candidate = await derive(password, salt);
  return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
}
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export function sessionToken() {
  return randomBytes(32).toString("hex");
}
