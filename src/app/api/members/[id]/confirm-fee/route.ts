import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { ApiError, body, ok, route } from "@/server/http";
import { getSociety, logActivity, nextPassNumber } from "@/server/society";

const { members, societies, feeProofs } = schema;
const confirmSchema = z.object({ method: z.enum(["cash", "card", "bank"]) });

/**
 * Treasurer only: confirm a student paid their fee and issue their pass.
 * (Minting the NFT on NEAR comes with the contract.)
 */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/members/[id]/confirm-fee">) => {
  const me = await requireMember(req, ["treasurer"]);
  const { id } = await ctx.params;
  const { method } = confirmSchema.parse(await body(req));

  const passNumber = await db().transaction(async (tx) => {
    // Lock the society row so pass numbers are handed out one at a time.
    const society = await getSociety(tx);
    await tx.select().from(societies).where(eq(societies.id, society.id)).for("update");

    const target = await tx.query.members.findFirst({ where: eq(members.id, id) });
    if (!target) throw new ApiError(404, "No such sign-up.");
    if (target.status === "active") throw new ApiError(409, "This member already has a pass.");

    const pass = await nextPassNumber(tx);
    await tx
      .update(members)
      .set({ status: "active", passNumber: pass, feeMethod: method, feeAmountCents: society.membershipFeeCents, feeConfirmedAt: new Date(), feeConfirmedBy: me.id })
      .where(eq(members.id, id));
    // Mark their proof of payment (if they uploaded one) as accepted.
    await tx
      .update(feeProofs)
      .set({ status: "accepted", reviewedBy: me.id, reviewedAt: new Date() })
      .where(and(eq(feeProofs.memberId, id), eq(feeProofs.status, "reviewing")));
    await logActivity(tx, "pass", `Fee confirmed (${method}). Pass #${String(pass).padStart(4, "0")} issued to ${target.name ?? target.email}`, me.id);
    return pass;
  });
  return ok({ passNumber });
});
