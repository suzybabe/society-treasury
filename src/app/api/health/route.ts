import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/server/db";

// Used by Railway's health check: confirms the app is up and can reach Postgres.
export async function GET() {
  await connection(); // always check live, never a build-time snapshot
  try {
    await db().execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "database unreachable" }, { status: 503 });
  }
}
