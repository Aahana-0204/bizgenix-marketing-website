import { describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";
import { phoneSchema, leadSchema } from "@/shared/schemas";
import {
  dedupeKey,
  verifySignature,
  backoff,
  statusToken,
  createStatusToken,
  verifyStatusToken,
  safeMeetingUrl,
} from "@/lib/security";
import { CreateOrUpdateLead } from "@/application/CreateOrUpdateLead";
import { ProcessOutbox } from "@/application/ProcessOutbox";
import { MemoryStore } from "@/infrastructure/memory";
import type { Job } from "@/domain/models";
import { formContent } from "@/content/landing";
export const valid = {
  kind: "DEMO_BOOKING" as const,
  full_name: "Test Person",
  company_name: "Example Company",
  work_email: "qa@example.test",
  mobile: "9876543210",
  team_size: formContent.teamSizes[0],
  industry: formContent.industries[0],
  interested_in: formContent.interests[1],
  consent: true,
};
describe("validation and identity", () => {
  it.each(["9876543210", "+91 98765 43210", "919876543210"])(
    "normalizes %s",
    (value) => expect(phoneSchema.parse(value)).toBe("+919876543210"),
  );
  it.each(["1234567890", "987654321", "+449876543210"])("rejects %s", (value) =>
    expect(phoneSchema.safeParse(value).success).toBe(false),
  );
  it("deduplicates normalized identity", () =>
    expect(dedupeKey("QA@example.test", "+919876543210")).toBe(
      dedupeKey("qa@example.test", "+919876543210"),
    ));
  it("requires consent and demo industry", () => {
    expect(leadSchema.safeParse({ ...valid, consent: false }).success).toBe(
      false,
    );
    expect(
      leadSchema.safeParse({ ...valid, industry: undefined }).success,
    ).toBe(false);
  });
  it("permits plan enquiries without demo fields", () =>
    expect(
      leadSchema.parse({
        ...valid,
        kind: "PLAN_ENQUIRY",
        industry: undefined,
        interested_in: undefined,
        plan_interest: "5 Users",
      }).kind,
    ).toBe("PLAN_ENQUIRY"));
  it("only accepts HTTPS meeting URLs", () => {
    expect(safeMeetingUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeMeetingUrl("https://meet.example.test/room")).toBe(
      "https://meet.example.test/room",
    );
  });
});
describe("signature and retry policy", () => {
  it("verifies the exact raw body in constant time", () => {
    const body = '{"test":1}';
    const sig = createHmac("sha256", "secret").update(body).digest("hex");
    expect(verifySignature(body, sig, "secret")).toBe(true);
    expect(verifySignature(body, `sha256=${sig}`, "secret")).toBe(true);
    expect(verifySignature(body + " ", sig, "secret")).toBe(false);
    expect(verifySignature(body, "x", "secret")).toBe(false);
  });
  it("uses bounded exponential retries", () =>
    expect([1, 2, 3, 4, 5, 6].map(backoff)).toEqual([
      60000,
      300000,
      1800000,
      7200000,
      43200000,
      null,
    ]));
  it("binds status tokens to the lead", () =>
    expect(statusToken("a", "secret")).not.toBe(statusToken("b", "secret")));
});
describe("booking capability freshness", () => {
  it("rejects forged and expired tokens and returns the capture cutoff", () => {
    const now = Date.now();
    const token = createStatusToken("lead", "secret", now);
    expect(verifyStatusToken("lead", token, "secret", now)).toEqual(
      new Date(now),
    );
    expect(verifyStatusToken("other", token, "secret", now)).toBeNull();
    expect(
      verifyStatusToken("lead", token, "secret", now + 172800001),
    ).toBeNull();
  });
});
describe("lead capture use case", () => {
  it("upserts duplicate identity and retains its ID", async () => {
    const repo = new MemoryStore();
    const service = new CreateOrUpdateLead(repo, { allow: async () => true });
    const a = await service.execute(valid, "ip");
    const b = await service.execute(
      { ...valid, full_name: "Updated Person" },
      "ip",
    );
    expect(a.id).toBe(b.id);
    expect(repo.leads.size).toBe(1);
    expect(b.fullName).toBe("Updated Person");
  });
  it("does not store rate-limited or honeypot submissions", async () => {
    const repo = new MemoryStore();
    await expect(
      new CreateOrUpdateLead(repo, { allow: async () => false }).execute(
        valid,
        "ip",
      ),
    ).rejects.toMatchObject({ status: 429 });
    await expect(
      new CreateOrUpdateLead(repo, { allow: async () => true }).execute(
        { ...valid, website: "bot" },
        "ip",
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(repo.leads.size).toBe(0);
  });
});
describe("outbox use case", () => {
  const job: Job = {
    id: "j",
    type: "CRM_UPSERT_LEAD",
    payload: { leadId: "l" },
    idempotencyKey: "k",
    attempts: 1,
    leaseToken: "lease",
  };
  it("completes successful delivery", async () => {
    const complete = vi.fn();
    const processor = new ProcessOutbox(
      { claim: async () => [job], complete, retry: vi.fn() },
      { send: async () => {} },
      vi.fn(),
    );
    expect(await processor.execute()).toEqual({ processed: 1, completed: 1 });
    expect(complete).toHaveBeenCalledWith(job);
  });
  it("schedules failure and alerts at exhaustion", async () => {
    const retry = vi.fn(),
      alert = vi.fn();
    const exhausted = { ...job, attempts: 6 };
    await new ProcessOutbox(
      { claim: async () => [exhausted], complete: vi.fn(), retry },
      {
        send: async () => {
          throw new Error("provider down");
        },
      },
      alert,
    ).execute();
    expect(retry).toHaveBeenCalledWith(exhausted, null);
    expect(alert).toHaveBeenCalledWith("j");
  });
});
