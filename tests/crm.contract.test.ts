import {
  afterAll,
  beforeAll,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
vi.mock("@/infrastructure/logger", () => ({ logger: { info: vi.fn() } }));
import { HttpCrmGateway } from "@/infrastructure/crm/http/gateway";
import { MockCrmGateway } from "@/infrastructure/crm/mock";
import { MemoryStore } from "@/infrastructure/memory";
import { leadSchema } from "@/shared/schemas";
import { formContent } from "@/content/landing";
const ids = new Map<string, string>();
const server = setupServer(
  http.post("https://crm.example.test/leads/upsert", async ({ request }) => {
    if (!request.headers.get("Idempotency-Key"))
      return new HttpResponse(null, { status: 400 });
    const body = (await request.json()) as { dedupe_key: string };
    const id = ids.get(body.dedupe_key) || `crm_${ids.size}`;
    ids.set(body.dedupe_key, id);
    return HttpResponse.json({ id });
  }),
  http.post(
    "https://crm.example.test/bookings/upsert",
    () => new HttpResponse(null, { status: 204 }),
  ),
);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
for (const [name, make] of [
  ["mock", () => new MockCrmGateway()],
  ["http", () => new HttpCrmGateway("https://crm.example.test", "test-token")],
] as const)
  describe(`${name} CRM contract`, () => {
    it("returns a stable remote identity for repeated upserts", async () => {
      const store = new MemoryStore();
      const lead = await store.save(
        leadSchema.parse({
          kind: "PLAN_ENQUIRY",
          full_name: "Test Person",
          company_name: "Test Company",
          work_email: "test@example.test",
          mobile: "9876543210",
          team_size: formContent.teamSizes[0],
          plan_interest: "5 Users",
          consent: true,
        }),
        "dedupe",
      );
      const gateway = make();
      expect(await gateway.upsertLead(lead, "first")).toEqual(
        await gateway.upsertLead(lead, "second"),
      );
      await expect(
        gateway.attachBooking(
          lead,
          {
            id: "b",
            calBookingUid: "uid",
            leadId: lead.id,
            status: "CONFIRMED",
            startAt: new Date(),
            endAt: new Date(Date.now() + 1200000),
            timezone: "Asia/Kolkata",
            eventAt: new Date(),
          },
          "booking",
        ),
      ).resolves.toBeUndefined();
    });
  });
it("retries HTTP failures instead of accepting an unsynced lead", async () => {
  server.use(
    http.post(
      "https://crm.example.test/leads/upsert",
      () => new HttpResponse(null, { status: 503 }),
    ),
  );
  await expect(
    new HttpCrmGateway("https://crm.example.test", "key").upsertLead(
      {} as never,
      "key",
    ),
  ).rejects.toThrow();
});
