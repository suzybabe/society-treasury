import { eq } from "drizzle-orm";
import { enqueueChain, syncChainSoon } from "@/server/chain";
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
  studentQuorum: z.number().int().min(1).max(100),
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
        studentQuorum: s.studentQuorum,
        membershipFeeCents: toCents(s.membershipFee),
        openingBalanceCents: toCents(s.openingBalance),
      })
      .where(eq(schema.societies.id, society.id))
      .returning();
    const activityId = await logActivity(tx, "settings", `Rules updated: more than ${s.approvalPercent}% of eligible votes to pass, fee €${s.membershipFee.toFixed(2)}`, me.id);
    await enqueueChain(tx, {
      method: "update_settings",
      args: { settings: { approval_percent: s.approvalPercent, auto_approve_limit_cents: 0, membership_fee_cents: toCents(s.membershipFee) } },
      onBehalfOf: me.nearAccountId,
      activityId,
    });
    if (s.studentQuorum !== society.studentQuorum) {
      await enqueueChain(tx, { method: "set_student_quorum", args: { quorum: s.studentQuorum }, onBehalfOf: me.nearAccountId });
    }
    return row;
  });
  syncChainSoon();
  return ok({ settings: toSettings(updated) });
});
