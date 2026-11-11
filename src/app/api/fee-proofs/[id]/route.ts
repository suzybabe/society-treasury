import { eq } from "drizzle-orm";
import { z } from "zod";
import { currentMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { fileResponse } from "@/server/files";
import { ApiError, route } from "@/server/http";

/**
 * A proof-of-payment file. Visible only to the treasurer and the student who
 * uploaded it, since it may contain bank details.
 */
export const GET = route(async (req: Request, ctx: RouteContext<"/api/fee-proofs/[id]">) => {
  const { member } = await currentMember(req);
  if (!member) throw new ApiError(403, "Finish signing up first.");
  const id = z.uuid().safeParse((await ctx.params).id);
  if (!id.success) throw new ApiError(404, "No such file.");

  const proof = await db().query.feeProofs.findFirst({ where: eq(schema.feeProofs.id, id.data) });
  const isTreasurer = member.status === "active" && member.role === "treasurer";
  if (!proof || (proof.memberId !== member.id && !isTreasurer)) throw new ApiError(404, "No such file.");
  return fileResponse(proof);
});
