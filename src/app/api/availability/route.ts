import { dateSchema } from "@/shared/schemas";
import { getContainer } from "@/server/container";
import { handleRoute } from "@/server/http/handleRoute";
export const runtime = "nodejs";
export async function GET(request: Request) { return handleRoute(async () => getContainer().availability.day(dateSchema.parse(new URL(request.url).searchParams.get("date")))); }
