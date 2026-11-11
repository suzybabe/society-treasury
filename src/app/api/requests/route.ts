import { z } from "zod";
import { enqueueChain, syncChainSoon } from "@/server/chain";
import { COMMITTEE_ROLES, MIN_ELIGIBLE_VOTERS } from "@/lib/rules";
import { CATEGORIES } from "@/lib/types";
import { requireMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { ApiError, body, ok, route, toCents } from "@/server/http";
import { committeeMembers, logActivity, requestRef } from "@/server/society";

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

  // Nobody approves alone: with fewer than 2 eligible voters a request could never pass.
  const eligible = (await committeeMembers()).filter((m) => m.id !== me.id).length;
  if (eligible < MIN_ELIGIBLE_VOTERS) {
    throw new ApiError(409, "You need at least 3 committee members (president, treasurer and committee) before requests can be voted on. The president can add them in Settings.");
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
