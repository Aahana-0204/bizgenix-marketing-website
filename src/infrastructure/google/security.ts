import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import { safeEqual } from "@/lib/security";

export function encryptRefreshToken(token: string, key: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    "base64url",
  );
}
export function decryptRefreshToken(value: string, key: string) {
  const data = Buffer.from(value, "base64url");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    data.subarray(0, 12),
  );
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([
    decipher.update(data.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}
export function oauthState(email: string, secret: string, now = Date.now()) {
  const nonce = randomBytes(32).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ email, nonce, expires: now + 600000 }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return { nonce, state: `${payload}.${signature}` };
}
export function verifyOAuthState(
  state: string,
  nonce: string,
  secret: string,
  now = Date.now(),
): string | null {
  try {
    const [payload, signature, ...extra] = state.split(".");
    if (
      extra.length ||
      !signature ||
      !safeEqual(
        signature,
        createHmac("sha256", secret).update(payload).digest("hex"),
      )
    )
      return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data.email === "string" &&
      typeof data.nonce === "string" &&
      nonce.length > 0 &&
      safeEqual(data.nonce, nonce) &&
      Number.isFinite(data.expires) &&
      data.expires > now &&
      data.expires <= now + 600000
      ? data.email
      : null;
  } catch {
    return null;
  }
}
