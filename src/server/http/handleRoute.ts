import { ZodError } from "zod";
import { AppError, ValidationError } from "../domain/errors";

export async function handleRoute<T>(operation: () => Promise<T>, status = 200) {
  try { return Response.json({ success: true, data: await operation(), error: null }, { status, headers: { "Cache-Control": "no-store" } }); }
  catch (error) {
    const known = error instanceof AppError;
    const invalid = error instanceof ZodError || error instanceof SyntaxError;
    if (!known && !invalid) console.error("Request failed", error instanceof Error ? error.name : "UnknownError");
    return Response.json({ success: false, data: null, error: { code: known ? error.code : invalid ? "VALIDATION_ERROR" : "SERVICE_UNAVAILABLE", message: known ? error.message : invalid ? "Please check your form fields and try again." : "The service is temporarily unavailable. Please try again shortly." } }, { status: known ? error.status : invalid ? 400 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
export async function readBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new ValidationError("Send a JSON request");
  const reader = request.body?.getReader();
  if (!reader) throw new ValidationError("Request body is required");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 16384) { await reader.cancel(); throw new ValidationError("Request is too large"); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}
