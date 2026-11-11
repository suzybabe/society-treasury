import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { body, ok, route, toCents } from "@/server/http";
import { getSociety, logActivity, toSettings } from "@/server/society";

const euros = (max: number) => z.number().min(0).max(max);

const settingsSchema = z.object({
  societyName: z.string().trim().min(2).max(80),
  shortName: z.string().trim().min(2).max(10).transform((s) => s.toUpperCase()),
  approvalPercent: z.number().int().min(50).max(90),
  autoApproveLimit: euros(1000),
  membershipFee: euros(1000),
  openingBalance: euros(1_000_000),
});

/** President only: voting rules, fee and society details. Recorded in the activity log. */
export const PATCH = route(async (req: Request) => {
  const me = await requireMember(req, ["president"]);
  const s = settingsSchema.parse(await body(req));
  const updated = await db().transaction(async (tx) => {
    const society = await getSociety(tx);
    const [row] = await tx
      .update(schema.societies)
      .set({
        name: s.societyName,
        shortName: s.shortName,
        approvalPercent: s.approvalPercent,
        autoApproveLimitCents: toCents(s.autoApproveLimit),
        membershipFeeCents: toCents(s.membershipFee),
        openingBalanceCents: toCents(s.openingBalance),
      })
      .where(eq(schema.societies.id, society.id))
      .returning();
    await logActivity(tx, "settings", `Rules updated: more than ${s.approvalPercent}% to pass, auto-approve under €${s.autoApproveLimit.toFixed(2)}`, me.id);
    return row;
  });
  return ok({ settings: toSettings(updated) });
});
