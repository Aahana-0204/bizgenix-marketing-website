import { monthSchema } from "@/shared/schemas";
import { getContainer } from "@/server/container";
import { handleRoute } from "@/server/http/handleRoute";
export const runtime = "nodejs";
export async function GET(request: Request) { return handleRoute(async () => { const month = monthSchema.parse(new URL(request.url).searchParams.get("month")); return getContainer().availability.month(month); }); }
