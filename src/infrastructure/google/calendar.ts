import { z } from "zod";
import type { BusyPeriod } from "@/domain/scheduling";
import { AppError } from "@/application/CreateOrUpdateLead";
import { decryptRefreshToken } from "./security";

const eventSchema = z.object({
  id: z.string(),
  status: z.string(),
  start: z.object({ dateTime: z.string().optional() }).optional(),
  end: z.object({ dateTime: z.string().optional() }).optional(),
  hangoutLink: z.string().optional(),
  htmlLink: z.string().optional(),
  extendedProperties: z
    .object({ private: z.record(z.string(), z.string()).optional() })
    .optional(),
});
export type GoogleEvent = z.infer<typeof eventSchema>;
export class GoogleApiError extends Error {
  constructor(public status: number) {
    super("Google Calendar request failed");
  }
}
export class GoogleCalendar {
  constructor(
    private config: {
      clientId: string;
      clientSecret: string;
      tokenKey: string;
      createMeet?: boolean;
    },
    private http: typeof fetch = fetch,
  ) {}
  async accessToken(encryptedToken: string) {
    const response = await this.http("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: decryptRefreshToken(
          encryptedToken,
          this.config.tokenKey,
        ),
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new AppError(
        503,
        "A host calendar needs to be reconnected. Please try again later.",
      );
    return z.object({ access_token: z.string() }).parse(await response.json())
      .access_token;
  }
  private async request(token: string, path: string, init?: RequestInit) {
    const response = await this.http(
      `https://www.googleapis.com/calendar/v3/${path}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!response.ok) throw new GoogleApiError(response.status);
    return response.json();
  }
  async busy(
    token: string,
    calendarId: string,
    start: string,
    end: string,
  ): Promise<BusyPeriod[]> {
    const response = z
      .object({
        calendars: z.record(
          z.string(),
          z.object({
            errors: z.array(z.unknown()).optional(),
            busy: z.array(
              z.object({
                start: z.iso.datetime({ offset: true }),
                end: z.iso.datetime({ offset: true }),
              }),
            ),
          }),
        ),
      })
      .parse(
        await this.request(token, "freeBusy", {
          method: "POST",
          body: JSON.stringify({
            timeMin: start,
            timeMax: end,
            items: [{ id: calendarId }],
          }),
        }),
      );
    const calendar = response.calendars[calendarId];
    if (!calendar || calendar.errors?.length)
      throw new AppError(
        503,
        "Calendar availability is temporarily unavailable. Please try again.",
      );
    return calendar.busy;
  }
  async event(
    token: string,
    calendarId: string,
    eventId: string,
  ): Promise<GoogleEvent | null> {
    try {
      return eventSchema.parse(
        await this.request(
          token,
          `calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        ),
      );
    } catch (error) {
      if (error instanceof GoogleApiError && error.status === 404) return null;
      throw error;
    }
  }
  async create(
    token: string,
    calendarId: string,
    data: {
      eventId: string;
      leadId: string;
      fullName: string;
      email: string;
      company: string;
      start: string;
      end: string;
    },
  ) {
    const event = await this.request(
      token,
      `calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all&conferenceDataVersion=1`,
      {
        method: "POST",
        body: JSON.stringify({
          id: data.eventId,
          summary: `Bizgenix CRM demo — ${data.company}`,
          description: `Live CRM walkthrough for ${data.fullName} at ${data.company}.\nLead reference: ${data.leadId}\nTo change this appointment, contact the organizer through this calendar invitation.`,
          start: { dateTime: data.start, timeZone: "Asia/Kolkata" },
          end: { dateTime: data.end, timeZone: "Asia/Kolkata" },
          attendees: [{ email: data.email, displayName: data.fullName }],
          ...(this.config.createMeet === true
            ? {
                conferenceData: {
                  createRequest: {
                    requestId: data.eventId,
                    conferenceSolutionKey: { type: "hangoutsMeet" },
                  },
                },
              }
            : {}),
          transparency: "opaque",
          guestsCanModify: false,
          guestsCanInviteOthers: false,
          extendedProperties: {
            private: { leadId: data.leadId, source: "bizgenix-website" },
          },
        }),
      },
    );
    return eventSchema.parse(event);
  }
}
