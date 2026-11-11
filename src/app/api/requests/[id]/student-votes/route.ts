import { eq } from "drizzle-orm";
import { z } from "zod";
import { decide, isCommittee } from "@/lib/rules";
import { requireMember } from "@/server/auth";
import { enqueueChain, syncChainSoon } from "@/server/chain";
import { db, schema } from "@/server/db";
import { ApiError, body, ok, route } from "@/server/http";
import { activeMembers, getSociety, logActivity, parseRequestRef, requestRef, studentPollCounts } from "@/server/society";

const { spendRequests, studentVotes, votes } = schema;
const voteSchema = z.object({ choice: z.enum(["yes", "no"]) });

/**
 * Members with a pass who aren't on the committee: vote on a request. Once
 * enough students have voted, their majority counts as one committee vote.
 * Once each, and votes can't be changed.
 */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/requests/[id]/student-votes">) => {
  const me = await requireMember(req);
  if (isCommittee(me.role)) throw new ApiError(403, "Committee members vote in the committee vote.");
  const requestId = parseRequestRef((await ctx.params).id);
  if (!requestId) throw new ApiError(404, "No such request.");
  const { choice } = voteSchema.parse(await body(req));

  const status = await db().transaction(async (tx) => {
    // Lock the request so votes are counted one at a time.
    const [request] = await tx.select().from(spendRequests).where(eq(spendRequests.id, requestId)).for("update");
    if (!request) throw new ApiError(404, "No such request.");
    if (request.status !== "voting") throw new ApiError(409, "Voting on this request has closed.");

    const inserted = await tx.insert(studentVotes).values({ requestId, memberId: me.id, choice }).onConflictDoNothing().returning();
    if (inserted.length === 0) throw new ApiError(409, "You've already voted, and votes can't be changed.");

    const [committeeVotes, members, society, studentPoll] = await Promise.all([
      tx.query.votes.findMany({ where: eq(votes.requestId, requestId) }),
      activeMembers(tx),
      getSociety(tx),
      studentPollCounts(tx, requestId),
    ]);
    // Same rules as the committee vote and the contract.
    const outcome = decide(
      { requesterId: request.requesterId, votes: committeeVotes.map((v) => ({ memberId: v.memberId, choice: v.choice, at: "" })), studentPoll },
      members,
      { approvalPercent: society.approvalPercent, studentQuorum: society.studentQuorum },
    );

    const ref = requestRef(requestId);
    const activityId = await logActivity(tx, "vote", `${me.name ?? me.email} voted ${choice.toUpperCase()} on ${ref} (student vote)`, me.id);
    await enqueueChain(tx, { method: "student_vote", args: { approve: choice === "yes" }, onBehalfOf: me.nearAccountId, target: { kind: "student_vote", requestId, memberId: me.id }, activityId });
    if (outcome !== "voting") {
      await tx.update(spendRequests).set({ status: outcome, decidedAt: new Date() }).where(eq(spendRequests.id, requestId));
      await logActivity(tx, "decision", `${ref} ${outcome}, with the student vote counted`, me.id);
    }
    return outcome;
  });
  syncChainSoon();
  return ok({ status });
});
