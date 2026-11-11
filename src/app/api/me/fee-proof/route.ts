import { eq } from "drizzle-orm";
import { z } from "zod";
import { currentMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { readUpload } from "@/server/files";
import { ApiError, ok, route } from "@/server/http";
import { latestFeeProof, loadMe } from "@/server/society";

const fieldsSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  method: z.enum(["cash", "card", "bank"]),
});

/**
 * A pending student submits proof that they paid the membership fee: their
 * name as on their student card, how they paid, and a receipt or screenshot.
 * The treasurer then reviews it and confirms or rejects it.
 */
export const POST = route(async (req: Request) => {
  const { member } = await currentMember(req);
  if (!member) throw new ApiError(403, "Finish signing up first.");
  if (member.status === "active") throw new ApiError(409, "Your membership is already confirmed.");

  const form = await req.formData().catch(() => null);
  const fields = fieldsSchema.parse({ name: form?.get("name"), method: form?.get("method") });
  const upload = await readUpload(form);

  const latest = await latestFeeProof(member.id);
  if (latest?.status === "reviewing") throw new ApiError(409, "Your payment is already being reviewed.");

  const updated = await db().transaction(async (tx) => {
    await tx.insert(schema.feeProofs).values({ memberId: member.id, method: fields.method, ...upload });
    const [row] = await tx.update(schema.members).set({ name: fields.name }).where(eq(schema.members.id, member.id)).returning();
    return row;
  });
  return ok({ me: await loadMe(updated) }, 201);
});
