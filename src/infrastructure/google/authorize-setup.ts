import "server-only";
import { googleSettings } from "@/composition/google-calendar";
import { safeEqual } from "@/lib/security";
import { AppError } from "@/application/CreateOrUpdateLead";
export function authorizeCalendarSetup(request: Request) {
  const config = googleSettings();
  if (
    !safeEqual(
      request.headers.get("authorization") || "",
      `Bearer ${config.setupSecret}`,
    )
  )
    throw new AppError(401, "Enter the calendar setup key.");
  return config;
}
