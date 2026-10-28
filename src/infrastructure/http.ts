import { ZodError } from "zod";
import { AppError } from "@/application/CreateOrUpdateLead";
import { reportFailure } from "./logger";
import { env } from "@/config/server";
import { isAllowedOrigin } from "./origin";
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function readJson(request: Request) {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    throw new AppError(415, "Please send JSON.");
  if (!isAllowedOrigin(request, env.NEXT_PUBLIC_SITE_URL))
    throw new AppError(403, "This request origin is not allowed.");
  const body = await readBody(request, 16000);
  try {
    return JSON.parse(body);
  } catch {
    throw new AppError(400, "Invalid JSON.");
  }
}
export async function readBody(request: Request, max: number) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const parts: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > max) {
      await reader.cancel();
      throw new AppError(413, "Request too large.");
    }
    parts.push(value);
  }
  return Buffer.concat(parts).toString("utf8");
}
export async function handle(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ZodError)
      return json(
        {
          error: "Please check your details.",
          fields: error.flatten().fieldErrors,
        },
        422,
      );
    if (error instanceof AppError)
      return json({ error: error.message }, error.status);
    reportFailure("REQUEST_FAILED");
    return json(
      { error: "We couldn’t complete that request. Please try again." },
      503,
    );
  }
}
