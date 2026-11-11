import { z } from "zod";
import { COMMITTEE_ROLES } from "@/lib/rules";
import { CATEGORIES } from "@/lib/types";
import { requireMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { body, ok, route, toCents } from "@/server/http";
import { getSociety, logActivity, requestRef } from "@/server/society";

const requestSchema = z.object({
  title: z.string().trim().min(3, "Say what it's for").max(120),
  description: z.string().trim().max(2000).default(""),
  category: z.enum(CATEGORIES),
  amount: z.number().positive().max(100_000),
});

/**
 * Committee only: create a spending request. Anything under the auto-approve
 * limit is approved straight away; everything else goes to a committee vote.
 */
export const POST = route(async (req: Request) => {
  const me = await requireMember(req, COMMITTEE_ROLES);
  const input = requestSchema.parse(await body(req));
  const amountCents = toCents(input.amount);

  const id = await db().transaction(async (tx) => {
    const society = await getSociety(tx);
    const auto = amountCents < society.autoApproveLimitCents;
    const [row] = await tx
      .insert(schema.spendRequests)
      .values({
        title: input.title,
        description: input.description,
        category: input.category,
        amountCents,
        requesterId: me.id,
        status: auto ? "auto" : "voting",
        decidedAt: auto ? new Date() : null,
      })
      .returning();
    const ref = requestRef(row.id);
    await logActivity(tx, "request", `${me.name ?? me.email} requested €${input.amount.toFixed(2)} for ${input.title}`, me.id);
    if (auto) await logActivity(tx, "decision", `${ref} auto-approved (under €${(society.autoApproveLimitCents / 100).toFixed(2)})`, me.id);
    return ref;
  });
  return ok({ id }, 201);
});
