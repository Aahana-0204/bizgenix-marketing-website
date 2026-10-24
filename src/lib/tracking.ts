"use client";
export type Consent = "accepted" | "rejected";
export const attributionKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
] as const;
declare global {
  interface Window {
    dataLayer: unknown[];
    __trackingDebug?: boolean;
  }
}
export function consentChoice(): Consent | null {
  try {
    const value = localStorage.getItem("bizgenix-consent-v1");
    return value === "accepted" || value === "rejected" ? value : null;
  } catch {
    return null;
  }
}
export function gtag(...args: unknown[]) {
  window.dataLayer ||= [];
  window.dataLayer.push(args);
}
export function track(
  event: string,
  data: Record<string, string> = {},
  onceKey?: string,
) {
  if (consentChoice() !== "accepted") return;
  try {
    if (onceKey && sessionStorage.getItem(`event:${onceKey}`)) return;
    if (onceKey) sessionStorage.setItem(`event:${onceKey}`, "1");
  } catch {}
  const entry = { event, ...data };
  window.dataLayer ||= [];
  window.dataLayer.push(entry);
  if (process.env.NODE_ENV !== "production" && window.__trackingDebug)
    console.info("[tracking]", entry);
}
function readCookie(name: string) {
  const value = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  try {
    return value ? decodeURIComponent(value) : undefined;
  } catch {
    return undefined;
  }
}
export function attribution(): Record<string, string> {
  const current = new URL(location.href);
  const source: Record<string, string> = {};
  if (consentChoice() === "accepted") {
    try {
      Object.assign(
        source,
        JSON.parse(readCookie("bizgenix-attribution") || "{}"),
      );
    } catch {}
  }
  for (const key of attributionKeys)
    if (!source[key] && current.searchParams.has(key))
      source[key] = current.searchParams.get(key)!.slice(0, 250);
  // Drop arbitrary query values and fragment (they may contain personal details).
  source.landing_page_url ||= `${current.origin}${current.pathname}`;
  try {
    source.referrer ||= document.referrer
      ? new URL(document.referrer).origin
      : "";
  } catch {}
  if (consentChoice() === "accepted") {
    for (const key of ["_fbp", "_fbc"]) {
      const value = readCookie(key);
      if (value) source[key] = value;
    }
    if (source.fbclid && !source._fbc)
      source._fbc = `fb.1.${Date.now()}.${source.fbclid}`;
    document.cookie = `bizgenix-attribution=${encodeURIComponent(JSON.stringify(source))}; Max-Age=2592000; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }
  return source;
}
export function changeConsent(choice: Consent) {
  try {
    localStorage.setItem("bizgenix-consent-v1", choice);
  } catch {}
  const status = choice === "accepted" ? "granted" : "denied";
  gtag("consent", "update", {
    analytics_storage: status,
    ad_storage: status,
    ad_user_data: status,
    ad_personalization: status,
  });
  if (choice === "rejected") {
    for (const key of ["bizgenix-attribution", "_fbp", "_fbc"])
      document.cookie = `${key}=; Max-Age=0; Path=/; SameSite=Lax`;
  } else {
    const source = attribution();
    const utm = Object.fromEntries(
      Object.entries(source).filter(([key]) => key.startsWith("utm_")),
    );
    window.dataLayer.push({ event: "consent_granted", ...utm });
  }
  window.dispatchEvent(new Event("bizgenix-consent"));
}
export function getStartedHref(url: string) {
  const next = new URL(url);
  const source = attribution();
  for (const key of attributionKeys)
    if (source[key]) next.searchParams.set(key, source[key]);
  return next.href;
}
