import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { currentMember } from "@/server/auth";
import { enqueueChain, syncChainSoon } from "@/server/chain";
import { db, schema, type Tx } from "@/server/db";
import type { MemberRow } from "@/server/db/schema";
import { env } from "@/server/env";
import { ApiError, body, ok, route } from "@/server/http";
import { getPrivyProfile } from "@/server/privy";
import { getSociety, loadMe, logActivity, nextPassNumber, toMe } from "@/server/society";

const { members, societies } = schema;

/** The signed-in person's membership, or null if they haven't registered. */
export const GET = route(async (req: Request) => {
  const { member } = await currentMember(req);
  return ok({ me: member ? await loadMe(member) : null });
});

/**
 * Makes a member president (or co-president) with an active pass. Used for
 * the people listed in BOOTSTRAP_PRESIDENT_EMAIL. The first president is set
 * on NEAR when the contract is deployed; co-presidents are added on-chain by
 * the app (the contract account pays the gas).
 */
async function makePresident(tx: Tx, member: MemberRow, near: string | null): Promise<MemberRow> {
  const society = await getSociety(tx);
  await tx.select().from(societies).where(eq(societies.id, society.id)).for("update");
  const existing = await tx.query.members.findFirst({ where: and(eq(members.role, "president"), eq(members.status, "active")) });
  const hadPass = member.passNumber != null;
  const [row] = await tx
    .update(members)
    .set({
      role: "president",
      status: "active",
      nearAccountId: near,
      ...(hadPass ? {} : { passNumber: await nextPassNumber(tx), feeMethod: "waived" as const, feeConfirmedAt: new Date() }),
    })
    .where(eq(members.id, member.id))
    .returning();
  const pass = String(row.passNumber).padStart(4, "0");
  const activityId = await logActivity(tx, "pass", existing ? `${row.name ?? row.email} joined as co-president with pass #${pass}` : `Founding president joined with pass #${pass}`, row.id);
  if (existing && near) {
    await enqueueChain(tx, { method: "add_president", args: { account_id: near }, onBehalfOf: null, system: true, target: { kind: "pass", memberId: row.id }, activityId });
  }
  return row;
}

/**
 * Registers the signed-in Privy user, or syncs their email and NEAR wallet.
 * Called after every sign-in. New sign-ups wait for the treasurer to confirm
 * their fee, except people listed in BOOTSTRAP_PRESIDENT_EMAIL, who become
 * (co-)presidents straight away.
 */
export const POST = route(async (req: Request) => {
  const { privyUserId, member } = await currentMember(req);
  const profile = await getPrivyProfile(privyUserId);
  const listed = env.presidentEmails().includes(profile.email);

  if (member) {
    const near = profile.nearAccountId ?? member.nearAccountId;
    // Listed after they'd already signed up, or added to the list later.
    if (listed && member.role !== "president") {
      const promoted = await db().transaction((tx) => makePresident(tx, { ...member, email: profile.email }, near));
      syncChainSoon();
      return ok({ me: await loadMe(promoted) });
    }
    if (member.email === profile.email && member.nearAccountId === profile.nearAccountId) return ok({ me: await loadMe(member) });
    const [updated] = await db().update(members).set({ email: profile.email, nearAccountId: near }).where(eq(members.id, member.id)).returning();
    return ok({ me: await loadMe(updated) });
  }

  const created = await db().transaction(async (tx) => {
    const [row] = await tx.insert(members).values({ privyUserId, email: profile.email, nearAccountId: profile.nearAccountId }).returning();
    return listed ? makePresident(tx, row, profile.nearAccountId) : row;
  });
  if (listed) syncChainSoon();
  return ok({ me: toMe(created) }, 201);
});

const nameSchema = z.object({ name: z.string().trim().min(2, "Enter your full name").max(80) });

/** Sets the member's display name (shown on their pass). */
export const PATCH = route(async (req: Request) => {
  const { member } = await currentMember(req);
  if (!member) throw new ApiError(403, "Finish signing up first.");
  const { name } = nameSchema.parse(await body(req));
  const [updated] = await db().update(members).set({ name }).where(eq(members.id, member.id)).returning();
  return ok({ me: await loadMe(updated) });
});
