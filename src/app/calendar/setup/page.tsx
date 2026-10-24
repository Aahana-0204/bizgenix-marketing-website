import type { Metadata } from "next";
import { CalendarSetup } from "@/components/booking/CalendarSetup";
import { site } from "@/config/site";
export const metadata: Metadata = {
  title: "Connect demo calendars | Bizgenix",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const { status } = await searchParams;
  return (
    <CalendarSetup
      duration={site.bookingDuration}
      startHour={site.bookingRules.startHour}
      endHour={site.bookingRules.endHour}
      initialStatus={typeof status === "string" ? status : undefined}
    />
  );
}
