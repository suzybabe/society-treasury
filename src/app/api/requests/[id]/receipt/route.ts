import { eq } from "drizzle-orm";
import { requireMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { readUpload } from "@/server/files";
import { ApiError, ok, route } from "@/server/http";
import { logActivity, parseRequestRef, requestRef } from "@/server/society";

const { spendRequests, receipts } = schema;

/**
 * Treasurer only: upload the receipt for an approved request and mark it
 * Spent. This can't be undone. The file's SHA-256 is stored so it can be
 * anchored on NEAR later.
 */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/requests/[id]/receipt">) => {
  const me = await requireMember(req, ["treasurer"]);
  const requestId = parseRequestRef((await ctx.params).id);
  if (!requestId) throw new ApiError(404, "No such request.");
  const upload = await readUpload(await req.formData().catch(() => null));

  await db().transaction(async (tx) => {
    const [request] = await tx.select().from(spendRequests).where(eq(spendRequests.id, requestId)).for("update");
    if (!request) throw new ApiError(404, "No such request.");
    if (request.status !== "approved" && request.status !== "auto") throw new ApiError(409, "Only approved requests can be marked Spent.");
    await tx.insert(receipts).values({ requestId, ...upload, uploadedBy: me.id });
    await tx.update(spendRequests).set({ status: "spent" }).where(eq(spendRequests.id, requestId));
    await logActivity(tx, "spent", `Receipt uploaded for ${requestRef(requestId)}, marked Spent`, me.id);
  });
  return ok({ sha256: upload.sha256 }, 201);
});
