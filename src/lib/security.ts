import { createHash, createHmac, timingSafeEqual } from "node:crypto";
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const dedupeKey = (email: string, phone: string) =>
  hash(`${email.trim().toLowerCase()}:${phone}`);
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function verifySignature(
  body: string,
  signature: string | null,
  secret: string,
) {
  const given = (signature || "").replace(/^sha256=/, "");
  return (
    /^[a-f0-9]{64}$/i.test(given) &&
    safeEqual(
      createHmac("sha256", secret).update(body).digest("hex"),
      given.toLowerCase(),
    )
  );
}
export function statusToken(id: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`booking-status:${id}`)
    .digest("hex");
}
export const backoff = (attempt: number) =>
  [60, 300, 1800, 7200, 43200][attempt - 1]
    ? [60, 300, 1800, 7200, 43200][attempt - 1] * 1000
    : null;
export function safeMeetingUrl(value?: string) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** Capability is scoped to one capture attempt, preventing an older booking appearing as a new one. */
export function createStatusToken(
  id: string,
  secret: string,
  now = Date.now(),
) {
  return `${now}.${statusToken(`${id}:${now}`, secret)}`;
}
export function verifyStatusToken(
  id: string,
  token: string,
  secret: string,
  now = Date.now(),
): Date | null {
  const [time, signature, ...extra] = token.split(".");
  const issued = Number(time);
  if (
    extra.length ||
    !Number.isSafeInteger(issued) ||
    issued > now + 30000 ||
    now - issued > 172800000 ||
    !signature
  )
    return null;
  return safeEqual(signature, statusToken(`${id}:${time}`, secret))
    ? new Date(issued)
    : null;
}
