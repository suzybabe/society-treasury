import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { requireMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { ApiError, ok, route } from "@/server/http";
import { logActivity, parseRequestRef, requestRef } from "@/server/society";

const { spendRequests, receipts } = schema;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = /^(image\/(png|jpeg|webp|heic|heif)|application\/pdf)$/;

/**
 * Treasurer only: upload the receipt for an approved request and mark it
 * Spent. This can't be undone. The file's SHA-256 is stored so it can be
 * anchored on NEAR later.
 */
export const POST = route(async (req: Request, ctx: RouteContext<"/api/requests/[id]/receipt">) => {
  const me = await requireMember(req, ["treasurer"]);
  const requestId = parseRequestRef((await ctx.params).id);
  if (!requestId) throw new ApiError(404, "No such request.");

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Attach the receipt as a file.");
  if (!ALLOWED.test(file.type)) throw new ApiError(400, "Receipts must be an image (PNG, JPG, WebP, HEIC) or a PDF.");
  if (file.size > MAX_BYTES) throw new ApiError(400, "Receipts must be 5 MB or smaller.");
  const data = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(data).digest("hex");

  await db().transaction(async (tx) => {
    const [request] = await tx.select().from(spendRequests).where(eq(spendRequests.id, requestId)).for("update");
    if (!request) throw new ApiError(404, "No such request.");
    if (request.status !== "approved" && request.status !== "auto") throw new ApiError(409, "Only approved requests can be marked Spent.");
    await tx.insert(receipts).values({ requestId, fileName: file.name.slice(0, 200), mimeType: file.type, sizeBytes: file.size, sha256, data, uploadedBy: me.id });
    await tx.update(spendRequests).set({ status: "spent" }).where(eq(spendRequests.id, requestId));
    await logActivity(tx, "spent", `Receipt uploaded for ${requestRef(requestId)}, marked Spent`, me.id);
  });
  return ok({ sha256 }, 201);
});
