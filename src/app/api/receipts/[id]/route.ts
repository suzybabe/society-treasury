import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { fileResponse } from "@/server/files";
import { ApiError, route } from "@/server/http";

/** Any active member can view any receipt: that's the point of the app. */
export const GET = route(async (req: Request, ctx: RouteContext<"/api/receipts/[id]">) => {
  await requireMember(req);
  const id = z.uuid().safeParse((await ctx.params).id);
  if (!id.success) throw new ApiError(404, "No such receipt.");
  const receipt = await db().query.receipts.findFirst({ where: eq(schema.receipts.id, id.data) });
  if (!receipt) throw new ApiError(404, "No such receipt.");
  return fileResponse(receipt);
});
