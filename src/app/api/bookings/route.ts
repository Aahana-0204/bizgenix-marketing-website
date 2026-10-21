import { bookingSchema } from "@/shared/schemas";
import { getContainer } from "@/server/container";
import { handleRoute, readBody } from "@/server/http/handleRoute";
export const runtime = "nodejs";
export async function POST(request: Request) { return handleRoute(async () => { const input = bookingSchema.parse(await readBody(request)); return getContainer().booking.book(input); }, 201); }
