import { test, expect } from "@playwright/test";
test("lead API validates origin, normalizes identity and deduplicates", async ({
  request,
}) => {
  const data = {
    kind: "PLAN_ENQUIRY",
    full_name: "API Test",
    company_name: "Example Co",
    work_email: "api@example.test",
    mobile: "+91 98765 43210",
    team_size: "1–5",
    plan_interest: "5 Users",
    consent: true,
  };
  expect(
    (
      await request.post("/api/leads", {
        data,
        headers: { Origin: "https://other.example.test" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/leads", {
        data: { ...data, mobile: "12" },
        headers: { Origin: "http://localhost:3100" },
      })
    ).status(),
  ).toBe(422);
  const a = await request.post("/api/leads", {
    data,
    headers: { Origin: "http://localhost:3100" },
  });
  const b = await request.post("/api/leads", {
    data,
    headers: { Origin: "http://localhost:3100" },
  });
  expect(a.status()).toBe(200);
  expect(b.status()).toBe(200);
  const left = await a.json(),
    right = await b.json();
  expect(left.leadId).toBe(right.leadId);
  expect(left.eventId).toBe(right.eventId);
  expect(
    (await request.get(`/api/bookings/status?leadId=${left.leadId}`)).status(),
  ).toBe(404);
  const status = await request.get(
    `/api/bookings/status?leadId=${left.leadId}`,
    { headers: { Authorization: `Bearer ${left.statusToken}` } },
  );
  expect(await status.json()).toEqual({ status: "PENDING" });
});
test("cron and webhook do not accept unauthenticated calls", async ({
  request,
}) => {
  expect((await request.post("/api/cron/outbox")).status()).toBe(401);
  const hook = await request.post("/api/webhooks/calcom", { data: {} });
  expect([401, 503]).toContain(hook.status());
});
