import { bookingSchema } from "@/shared/schemas";
import { getContainer } from "@/server/container";
import { handleRoute, readBody } from "@/server/http/handleRoute";
export const runtime = "nodejs";
export async function POST(request: Request) { return handleRoute(async () => getContainer().booking.book(bookingSchema.parse(await readBody(request))), 201); }
