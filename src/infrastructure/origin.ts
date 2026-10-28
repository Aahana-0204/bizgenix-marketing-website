export function isAllowedOrigin(request: Request, siteUrl?: string) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = siteUrl ? new URL(siteUrl).origin : requestOrigin;
  return origin === configuredOrigin || origin === requestOrigin;
}
