import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireFeeApprover } from "@/server/auth";
import { db, schema } from "@/server/db";
import { ApiError, body, ok, route } from "@/server/http";

const { feeProofs } = schema;
const rejectSchema = z.object({ note: z.string().trim().min(3, "Say what's wrong so they can fix it").max(300) });

/**
 * Treasurer (or the president until a treasurer is assigned): reject a
 * student's proof of payment with a reason. The
 * submission stays on record and the student can submit again.
 */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/members/[id]/reject-fee">) => {
  const me = await requireFeeApprover(req);
  const { id } = await ctx.params;
  const { note } = rejectSchema.parse(await body(req));

  const rejected = await db()
    .update(feeProofs)
    .set({ status: "rejected", reviewNote: note, reviewedBy: me.id, reviewedAt: new Date() })
    .where(and(eq(feeProofs.memberId, id), eq(feeProofs.status, "reviewing")))
    .returning({ id: feeProofs.id });
  if (rejected.length === 0) throw new ApiError(404, "There's no submission waiting for review.");
  return ok();
});
