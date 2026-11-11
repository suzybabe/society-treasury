import { z } from "zod";
import { COMMITTEE_ROLES } from "@/lib/rules";
import { requireMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { body, ok, route } from "@/server/http";

const eventSchema = z.object({
  name: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  startsAt: z.iso.datetime({ offset: true }),
});

/** Committee only: add an event members can check in to. */
export const POST = route(async (req: Request) => {
  const me = await requireMember(req, COMMITTEE_ROLES);
  const e = eventSchema.parse(await body(req));
  const [row] = await db()
    .insert(schema.events)
    .values({ name: e.name, location: e.location, startsAt: new Date(e.startsAt), createdBy: me.id })
    .returning();
  return ok({ id: String(row.id) }, 201);
});
