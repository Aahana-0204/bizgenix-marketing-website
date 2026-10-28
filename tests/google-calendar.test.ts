import { describe, expect, it, vi } from "vitest";
import {
  candidateSlots,
  nextCandidateDate,
  indiaDate,
  isFree,
  type SchedulingRules,
} from "@/domain/scheduling";
import {
  encryptRefreshToken,
  decryptRefreshToken,
  oauthState,
  verifyOAuthState,
} from "@/infrastructure/google/security";
import { GoogleCalendar } from "@/infrastructure/google/calendar";
import { GoogleScheduling } from "@/application/GoogleScheduling";
import type { PrismaClient } from "@prisma/client";

const rules: SchedulingRules = {
  durationMinutes: 30,
  bufferMinutes: 10,
  noticeMinutes: 120,
  horizonDays: 30,
  startHour: 10.5,
  endHour: 18,
  weekdays: [1, 2, 3, 4, 5],
};
describe("automatic slots for a connected host", () => {
  it("offers Pranesh's slots while the second host is unconnected, and removes his busy periods", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T00:00:00Z"));
    try {
      const busy = vi.fn().mockResolvedValue([]);
      const db = {
        googleCalendarConnection: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { email: "pranesh@bizgenix.ai", encryptedRefreshToken: "test" },
            ]),
        },
        calendarReservation: { findMany: vi.fn().mockResolvedValue([]) },
      } as unknown as PrismaClient;
      const google = {
        accessToken: vi.fn().mockResolvedValue("test-access"),
        busy,
      } as unknown as GoogleCalendar;
      const scheduler = new GoogleScheduling(db, google, rules, [
        "pranesh@bizgenix.ai",
        "khushi@bizgenix.ai",
      ]);
      expect(await scheduler.availability("2026-10-26")).toHaveLength(15);
      busy.mockResolvedValue([
        { start: "2026-10-26T07:30:00Z", end: "2026-10-26T08:00:00Z" },
      ]);
      const slots = await scheduler.availability("2026-10-26");
      expect(slots).toContainEqual({
        startAt: "2026-10-26T05:00:00.000Z",
        presenter: "pranesh@bizgenix.ai",
      });
      expect(slots).not.toContainEqual({
        startAt: "2026-10-26T07:30:00.000Z",
        presenter: "pranesh@bizgenix.ai",
      });
      expect(slots).not.toContainEqual({
        startAt: "2026-10-26T08:00:00.000Z",
        presenter: "pranesh@bizgenix.ai",
      });
      expect(slots).toHaveLength(12);
    } finally {
      vi.useRealTimers();
    }
  });
});
describe("Google booking availability rules", () => {
  it("opens the first upcoming working day instead of an empty weekend or elapsed day", () => {
    expect(nextCandidateDate(rules, new Date("2026-10-24T10:00:00Z"))).toBe(
      "2026-10-26",
    );
    expect(nextCandidateDate(rules, new Date("2026-10-26T12:00:00Z"))).toBe(
      "2026-10-27",
    );
  });
  it("automatically creates fifteen 30-minute appointments from 10:30am to 6pm IST", () => {
    const slots = candidateSlots(
      "2026-10-26",
      rules,
      new Date("2026-10-25T00:00:00Z"),
    );
    expect(slots).toHaveLength(15);
    expect(slots[0]).toBe("2026-10-26T05:00:00.000Z");
    expect(slots.at(-1)).toBe("2026-10-26T12:00:00.000Z");
    expect(Date.parse(slots.at(-1)!) + rules.durationMinutes * 60000).toBe(
      Date.parse("2026-10-26T18:00:00+05:30"),
    );
    expect(
      slots
        .slice(1)
        .every(
          (slot, i) => Date.parse(slot) - Date.parse(slots[i]) === 1800000,
        ),
    ).toBe(true);
  });
  it("uses Indian local dates at a UTC day boundary", () => {
    expect(indiaDate(new Date("2026-10-25T20:00:00Z"))).toBe("2026-10-26");
  });
  it("respects working hours, weekends, notice, horizon and half-hour starts", () => {
    const now = new Date("2026-10-26T06:00:00Z"); // Monday 11:30 IST.
    const slots = candidateSlots("2026-10-26", rules, now);
    expect(slots[0]).toBe("2026-10-26T08:00:00.000Z"); // 13:30 IST.
    expect(slots.at(-1)).toBe("2026-10-26T12:00:00.000Z"); // Ends at 18:00 IST.
    expect(candidateSlots("2026-10-31", rules, now)).toEqual([]);
    expect(candidateSlots("2026-10-25", rules, now)).toEqual([]);
    expect(candidateSlots("2026-11-25", rules, now)).toEqual([]);
    expect(candidateSlots("2026-02-30", rules, now)).toEqual([]);
    expect(slots).not.toContain("2026-10-26T08:15:00.000Z");
  });
  it("blocks overlaps and buffers while accepting exact buffer boundaries", () => {
    const slot = "2026-10-26T05:00:00.000Z";
    expect(
      isFree(
        slot,
        [{ start: "2026-10-26T05:15:00Z", end: "2026-10-26T06:00:00Z" }],
        rules,
      ),
    ).toBe(false);
    expect(
      isFree(
        slot,
        [{ start: "2026-10-26T05:35:00Z", end: "2026-10-26T06:00:00Z" }],
        rules,
      ),
    ).toBe(false);
    expect(
      isFree(
        slot,
        [{ start: "2026-10-26T05:40:00Z", end: "2026-10-26T06:00:00Z" }],
        rules,
      ),
    ).toBe(true);
    expect(
      isFree(
        slot,
        [{ start: "2026-10-26T04:00:00Z", end: "2026-10-26T04:50:00Z" }],
        rules,
      ),
    ).toBe(true);
    expect(
      isFree(
        slot,
        [
          {
            start: "2026-10-26T00:00:00+05:30",
            end: "2026-10-27T00:00:00+05:30",
          },
        ],
        rules,
      ),
    ).toBe(false);
  });
});
describe("calendar connection security", () => {
  const key = "ab".repeat(32);
  it("encrypts refresh tokens with authenticated randomized ciphertext", () => {
    const token = encryptRefreshToken("private-refresh-token", key);
    expect(token).not.toContain("private-refresh-token");
    expect(decryptRefreshToken(token, key)).toBe("private-refresh-token");
    expect(encryptRefreshToken("private-refresh-token", key)).not.toBe(token);
    const tampered = Buffer.from(token, "base64url");
    tampered[30] ^= 1;
    expect(() =>
      decryptRefreshToken(tampered.toString("base64url"), key),
    ).toThrow();
    expect(() => decryptRefreshToken(token, "bc".repeat(32))).toThrow();
  });
  it("binds OAuth state to the host, browser nonce, secret and expiry", () => {
    const { nonce, state } = oauthState("host@example.test", key, 1000);
    expect(verifyOAuthState(state, nonce, key, 2000)).toBe("host@example.test");
    expect(verifyOAuthState(state, "another-browser", key, 2000)).toBeNull();
    expect(verifyOAuthState(state, nonce, "wrong-secret", 2000)).toBeNull();
    expect(verifyOAuthState(state, nonce, key, 601000)).toBeNull();
    expect(verifyOAuthState(`${state}extra`, nonce, key, 2000)).toBeNull();
  });
});
describe("Google Calendar API contracts", () => {
  const config = {
    clientId: "client",
    clientSecret: "secret",
    tokenKey: "ab".repeat(32),
  };
  it("refreshes authorization on the server without exposing the refresh token", async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ access_token: "access" }));
    const google = new GoogleCalendar(config, http);
    expect(
      await google.accessToken(encryptRefreshToken("refresh", config.tokenKey)),
    ).toBe("access");
    const [url, init] = http.mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect((init?.body as URLSearchParams).get("refresh_token")).toBe(
      "refresh",
    );
  });
  it("fails closed on partial free/busy errors rather than offering false slots", async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        calendars: {
          "host@example.test": { busy: [], errors: [{ reason: "notFound" }] },
        },
      }),
    );
    await expect(
      new GoogleCalendar(config, http).busy(
        "access",
        "host@example.test",
        "2026-10-26T00:00:00Z",
        "2026-10-27T00:00:00Z",
      ),
    ).rejects.toThrow("temporarily unavailable");
  });
  it("creates an opaque event on only the assigned host's calendar with an attendee invitation and stable event ID", async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ id: "abc123", status: "confirmed" }));
    await new GoogleCalendar(config, http).create(
      "access",
      "host@example.test",
      {
        eventId: "abc123",
        leadId: "lead",
        fullName: "Guest",
        email: "guest@example.test",
        company: "Example",
        start: "2026-10-26T05:00:00Z",
        end: "2026-10-26T05:30:00Z",
      },
    );
    const [url, init] = http.mock.calls[0];
    expect(url).toContain(
      "calendars/host%40example.test/events?sendUpdates=all",
    );
    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({
      id: "abc123",
      transparency: "opaque",
      attendees: [{ email: "guest@example.test" }],
      extendedProperties: { private: { leadId: "lead" } },
    });
    expect(body.attendees).toHaveLength(1);
    expect(body).not.toHaveProperty("conferenceData");
  });
  it("distinguishes absent events from provider errors for safe retry recovery", async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(new Response("", { status: 503 }));
    const google = new GoogleCalendar(config, http);
    expect(await google.event("access", "host", "event")).toBeNull();
    await expect(google.event("access", "host", "event")).rejects.toThrow();
  });
});
