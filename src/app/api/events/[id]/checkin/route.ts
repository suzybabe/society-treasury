import { eq } from "drizzle-orm";
import { requireMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { ApiError, ok, route } from "@/server/http";
import { logActivity } from "@/server/society";

/** Any active member: check in to an event. Checking in twice is harmless. */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/events/[id]/checkin">) => {
  const me = await requireMember(req);
  const eventId = Number((await ctx.params).id);
  if (!Number.isInteger(eventId)) throw new ApiError(404, "No such event.");

  await db().transaction(async (tx) => {
    const event = await tx.query.events.findFirst({ where: eq(schema.events.id, eventId) });
    if (!event) throw new ApiError(404, "No such event.");
    const inserted = await tx.insert(schema.checkins).values({ eventId, memberId: me.id }).onConflictDoNothing().returning();
    if (inserted.length) await logActivity(tx, "checkin", `${me.name ?? me.email} checked in to ${event.name}`, me.id);
  });
  return ok();
});
