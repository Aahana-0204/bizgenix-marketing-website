import { container } from "@/composition/container";
import { json } from "@/infrastructure/http";
export async function GET() {
  try {
    const db = container().db;
    if (db) await db.$queryRaw`SELECT 1`;
    return json({
      status: db ? "ok" : "preview",
      database: db ? "connected" : "not-configured",
    });
  } catch {
    return json({ status: "unavailable" }, 503);
  }
}
