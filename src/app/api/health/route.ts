import { sql } from "drizzle-orm";
import { nearConfigured } from "@/server/near";
import { connection } from "next/server";
import { db } from "@/server/db";

// Used by Railway's health check: confirms the app is up and can reach Postgres.
export async function GET() {
  await connection(); // always check live, never a build-time snapshot
  try {
    await db().execute(sql`select 1`);
    // NEAR sync status is informational: it never fails the health check.
    const [jobs] = await db().execute<{ pending: number; failed: number }>(
      sql`select count(*) filter (where status = 'pending')::int as pending, count(*) filter (where status = 'failed')::int as failed from chain_jobs`,
    );
    return Response.json({ ok: true, near: { configured: nearConfigured(), pending: jobs?.pending ?? 0, failed: jobs?.failed ?? 0 } });
  } catch {
    return Response.json({ ok: false, error: "database unreachable" }, { status: 503 });
  }
}
