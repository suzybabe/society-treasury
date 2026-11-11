import { and, eq, sql } from "drizzle-orm";
import { connection } from "next/server";
import { db, schema } from "@/server/db";
import { route } from "@/server/http";
import { getSociety, toSettings } from "@/server/society";

/**
 * Public summary for the sign-in page: society details and headline totals.
 * Transparency is the point of the app, so these numbers are open to anyone.
 */
export const GET = route(async () => {
  await connection(); // live numbers on every request
  const d = db();
  const society = await getSociety(d);
  const [[fees], [spent], [receipts]] = await Promise.all([
    d.select({ passes: sql<number>`count(*)::int`, cents: sql<number>`coalesce(sum(${schema.members.feeAmountCents}), 0)::int` }).from(schema.members).where(eq(schema.members.status, "active")),
    d.select({ cents: sql<number>`coalesce(sum(${schema.spendRequests.amountCents}), 0)::int` }).from(schema.spendRequests).where(and(eq(schema.spendRequests.status, "spent"))),
    d.select({ count: sql<number>`count(*)::int` }).from(schema.receipts),
  ]);
  const settings = toSettings(society);
  return Response.json({
    societyName: settings.societyName,
    shortName: settings.shortName,
    term: settings.term,
    membershipFee: settings.membershipFee,
    passes: fees.passes,
    receipts: receipts.count,
    balance: (society.openingBalanceCents + fees.cents - spent.cents) / 100,
  });
});
