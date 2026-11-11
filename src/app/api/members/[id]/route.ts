import { and, eq, ne } from "drizzle-orm";
import { enqueueChain, syncChainSoon } from "@/server/chain";
import { z } from "zod";
import { requireMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { ApiError, body, ok, route } from "@/server/http";
import { logActivity } from "@/server/society";

const { members } = schema;
const roleSchema = z.object({ role: z.enum(["treasurer", "committee", "student"]) });

/** President only: change a member's role. There's one treasurer at a time. */
export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/members/[id]">) => {
  const me = await requireMember(req, ["president"]);
  const { id } = await ctx.params;
  const { role } = roleSchema.parse(await body(req));

  await db().transaction(async (tx) => {
    const target = await tx.query.members.findFirst({ where: eq(members.id, id) });
    if (!target || target.status !== "active") throw new ApiError(404, "That member isn't active.");
    if (target.role === "president") throw new ApiError(400, "Use handover to change the president.");
    if (target.role === role) return;
    if (role === "treasurer") {
      // The previous treasurer stays on the committee.
      await tx.update(members).set({ role: "committee" }).where(and(eq(members.role, "treasurer"), ne(members.id, id)));
    }
    await tx.update(members).set({ role }).where(eq(members.id, id));
    const activityId = await logActivity(tx, "settings", `${target.name ?? target.email} is now ${role}`, me.id);
    if (target.nearAccountId) {
      await enqueueChain(tx, { method: "set_role", args: { account_id: target.nearAccountId, role: role === "student" ? null : role }, onBehalfOf: me.nearAccountId, activityId });
    }
  });
  syncChainSoon();
  return ok();
});
