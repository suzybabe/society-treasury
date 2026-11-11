import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { currentMember } from "@/server/auth";
import { db, schema } from "@/server/db";
import { env } from "@/server/env";
import { ApiError, body, ok, route } from "@/server/http";
import { getPrivyProfile } from "@/server/privy";
import { getSociety, logActivity, nextPassNumber, toMe } from "@/server/society";

const { members, societies } = schema;

/** The signed-in person's membership, or null if they haven't registered. */
export const GET = route(async (req: Request) => {
  const { member } = await currentMember(req);
  return ok({ me: member ? toMe(member) : null });
});

/**
 * Registers the signed-in Privy user, or syncs their email and NEAR wallet.
 * Called after every sign-in. New sign-ups wait for the treasurer to confirm
 * their fee, except the bootstrap president (BOOTSTRAP_PRESIDENT_EMAIL).
 */
export const POST = route(async (req: Request) => {
  const { privyUserId, member } = await currentMember(req);
  const profile = await getPrivyProfile(privyUserId);

  if (member) {
    if (member.email === profile.email && member.nearAccountId === profile.nearAccountId) return ok({ me: toMe(member) });
    const [updated] = await db()
      .update(members)
      .set({ email: profile.email, nearAccountId: profile.nearAccountId ?? member.nearAccountId })
      .where(eq(members.id, member.id))
      .returning();
    return ok({ me: toMe(updated) });
  }

  const created = await db().transaction(async (tx) => {
    // Lock the society row so two sign-ups can't claim the same pass number.
    const society = await getSociety(tx);
    await tx.select().from(societies).where(eq(societies.id, society.id)).for("update");

    const bootstrap = env.bootstrapPresidentEmail();
    const hasPresident = await tx.query.members.findFirst({ where: and(eq(members.role, "president"), eq(members.status, "active")) });
    const isFounder = !!bootstrap && bootstrap === profile.email && !hasPresident;

    const [row] = await tx
      .insert(members)
      .values({
        privyUserId,
        email: profile.email,
        nearAccountId: profile.nearAccountId,
        ...(isFounder
          ? { role: "president" as const, status: "active" as const, passNumber: await nextPassNumber(tx), feeMethod: "waived" as const, feeConfirmedAt: new Date() }
          : {}),
      })
      .returning();
    if (isFounder) await logActivity(tx, "pass", `Founding president joined with pass #${String(row.passNumber).padStart(4, "0")}`, row.id);
    return row;
  });
  return ok({ me: toMe(created) }, 201);
});

const nameSchema = z.object({ name: z.string().trim().min(2, "Enter your full name").max(80) });

/** Sets the member's display name (shown on their pass). */
export const PATCH = route(async (req: Request) => {
  const { member } = await currentMember(req);
  if (!member) throw new ApiError(403, "Finish signing up first.");
  const { name } = nameSchema.parse(await body(req));
  const [updated] = await db().update(members).set({ name }).where(eq(members.id, member.id)).returning();
  return ok({ me: toMe(updated) });
});
