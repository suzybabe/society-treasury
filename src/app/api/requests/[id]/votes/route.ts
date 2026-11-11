import { eq } from "drizzle-orm";
import { enqueueChain, syncChainSoon } from "@/server/chain";
import { z } from "zod";
import { COMMITTEE_ROLES, decide } from "@/lib/rules";
import { requireMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { ApiError, body, ok, route } from "@/server/http";
import { activeMembers, getSociety, logActivity, parseRequestRef, requestRef, studentPollCounts } from "@/server/society";

const { spendRequests, votes } = schema;
const voteSchema = z.object({ choice: z.enum(["yes", "no"]) });

/**
 * Committee only: vote on a request. One vote per member, never on your own
 * request, and votes can't be changed. The request is decided as soon as the
 * outcome is certain.
 */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/requests/[id]/votes">) => {
  const me = await requireMember(req, COMMITTEE_ROLES);
  const requestId = parseRequestRef((await ctx.params).id);
  if (!requestId) throw new ApiError(404, "No such request.");
  const { choice } = voteSchema.parse(await body(req));

  const status = await db().transaction(async (tx) => {
    // Lock the request so simultaneous votes are counted one at a time.
    const [request] = await tx.select().from(spendRequests).where(eq(spendRequests.id, requestId)).for("update");
    if (!request) throw new ApiError(404, "No such request.");
    if (request.status !== "voting") throw new ApiError(409, "Voting on this request has closed.");
    if (request.requesterId === me.id) throw new ApiError(403, "You can't vote on your own request.");

    const inserted = await tx.insert(votes).values({ requestId, memberId: me.id, choice }).onConflictDoNothing().returning();
    if (inserted.length === 0) throw new ApiError(409, "You've already voted, and votes can't be changed.");

    const [allVotes, members, society, studentPoll] = await Promise.all([
      tx.query.votes.findMany({ where: eq(votes.requestId, requestId) }),
      activeMembers(tx),
      getSociety(tx),
      studentPollCounts(tx, requestId),
    ]);
    // Same rules as the UI and the contract, so all three always agree.
    const outcome = decide(
      { requesterId: request.requesterId, votes: allVotes.map((v) => ({ memberId: v.memberId, choice: v.choice, at: "" })), studentPoll },
      members,
      { approvalPercent: society.approvalPercent, studentQuorum: society.studentQuorum },
    );

    const ref = requestRef(requestId);
    const activityId = await logActivity(tx, "vote", `${me.name ?? me.email} voted ${choice.toUpperCase()} on ${ref}`, me.id);
    // request_id (the contract's id) is filled in by the worker once the request is on NEAR.
    await enqueueChain(tx, { method: "vote", args: { approve: choice === "yes" }, onBehalfOf: me.nearAccountId, target: { kind: "vote", requestId, memberId: me.id }, activityId });
    if (outcome !== "voting") {
      await tx.update(spendRequests).set({ status: outcome, decidedAt: new Date() }).where(eq(spendRequests.id, requestId));
      await logActivity(tx, "decision", `${ref} ${outcome} by committee vote`, me.id);
    }
    return outcome;
  });
  syncChainSoon();
  return ok({ status });
});
