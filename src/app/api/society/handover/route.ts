import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { ApiError, body, ok, route } from "@/server/http";
import { getSociety, logActivity } from "@/server/society";

const { members, societies } = schema;
const handoverSchema = z.object({ nextPresidentId: z.uuid() });

const nextTerm = (term: string) => {
  const m = /^(\d{4})\/(\d{2,4})$/.exec(term);
  if (!m) return term;
  const a = Number(m[1]) + 1;
  return `${a}/${String(Number(m[2]) + 1).padStart(m[2].length, "0")}`;
};

/** President only: hand the presidency to the next committee. All records carry over. */
export const POST = route(async (req: Request) => {
  const me = await requireMember(req, ["president"]);
  const { nextPresidentId } = handoverSchema.parse(await body(req));
  if (nextPresidentId === me.id) throw new ApiError(400, "Choose someone else as the next president.");

  await db().transaction(async (tx) => {
    const next = await tx.query.members.findFirst({ where: eq(members.id, nextPresidentId) });
    if (!next || next.status !== "active") throw new ApiError(404, "That member isn't active.");
    const society = await getSociety(tx);
    const term = nextTerm(society.term);
    await tx.update(members).set({ role: "president" }).where(eq(members.id, next.id));
    await tx.update(members).set({ role: "student" }).where(eq(members.id, me.id));
    await tx.update(societies).set({ term }).where(eq(societies.id, society.id));
    await logActivity(tx, "settings", `Handover: ${next.name ?? next.email} is president for ${term}. All records carried over.`, me.id);
  });
  return ok();
});
