import { z } from "zod";
import { enqueueChain, syncChainSoon } from "@/server/chain";
import { COMMITTEE_ROLES, MIN_VOTING_SEATS, votingSeats } from "@/lib/rules";
import { CATEGORIES } from "@/lib/types";
import { requireMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { ApiError, body, ok, route, toCents } from "@/server/http";
import { activeMembers, getSociety, logActivity, requestRef } from "@/server/society";

const requestSchema = z.object({
  title: z.string().trim().min(3, "Say what it's for").max(120),
  description: z.string().trim().max(2000).default(""),
  category: z.enum(CATEGORIES),
  amount: z.number().positive().max(100_000),
});

/**
 * Committee only: create a spending request. Every request goes to a
 * committee vote, whatever the amount.
 */
export const POST = route(async (req: Request) => {
  const me = await requireMember(req, COMMITTEE_ROLES);
  const input = requestSchema.parse(await body(req));
  const amountCents = toCents(input.amount);

  // Nobody approves alone: a request needs at least 2 seats that can vote on it
  // (other committee members, plus the students' seat once there are enough students).
  const [members, society] = await Promise.all([activeMembers(), getSociety()]);
  if (votingSeats(me.id, members, { studentQuorum: society.studentQuorum }) < MIN_VOTING_SEATS) {
    throw new ApiError(409, `Not enough people can vote on this yet. Add committee members in Settings, or approve at least ${society.studentQuorum} students so their vote counts.`);
  }

  const id = await db().transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.spendRequests)
      .values({
        title: input.title,
        description: input.description,
        category: input.category,
        amountCents,
        requesterId: me.id,
        status: "voting",
      })
      .returning();
    const ref = requestRef(row.id);
    const activityId = await logActivity(tx, "request", `${me.name ?? me.email} requested €${input.amount.toFixed(2)} for ${input.title}`, me.id);
    await enqueueChain(tx, {
      method: "create_request",
      args: { app_ref: ref, title: input.title, category: input.category, amount_cents: amountCents },
      onBehalfOf: me.nearAccountId,
      target: { kind: "request", requestId: row.id },
      activityId,
    });
    return ref;
  });
  syncChainSoon();
  return ok({ id }, 201);
});
