import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/bookings/route";
import { GET } from "@/app/api/availability/route";
import { handleRoute, readBody } from "@/server/http/handleRoute";
import { getEnv } from "@/server/config/env";
describe("HTTP boundaries", () => {
  it("validates dates before resolving database configuration", async () => { const response = await GET(new Request("http://localhost/api/availability?date=2026-02-30")); expect(response.status).toBe(400); expect((await response.json()).error.code).toBe("VALIDATION_ERROR"); });
  it("rejects invalid booking fields before resolving database configuration", async () => { const response = await POST(new Request("http://localhost/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })); expect(response.status).toBe(400); });
  it("rejects oversized payloads", async () => { const request = new Request("http://localhost/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "x".repeat(17000) }) }); const response = await handleRoute(() => readBody(request)); expect(response.status).toBe(400); });
  it("maps malformed JSON to a validation response", async () => { const request = new Request("http://localhost/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }); expect((await handleRoute(() => readBody(request))).status).toBe(400); });
  it("maps missing server configuration to 503 rather than blaming form input", async () => { vi.stubEnv("DATABASE_URL", ""); try { const response = await handleRoute(async () => getEnv()); expect(response.status).toBe(503); expect((await response.json()).error.code).toBe("SERVICE_UNAVAILABLE"); } finally { vi.unstubAllEnvs(); } });
});
