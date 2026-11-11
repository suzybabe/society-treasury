import 'server-only'
import { and, eq } from 'drizzle-orm'
import type { Role } from '@/lib/types'
import { db, schema } from './db'
import type { MemberRow } from './db/schema'
import { ApiError } from './http'
import { verifyRequest } from './privy'

/** The member record for the signed-in Privy user, or null if they haven't registered yet. */
export async function currentMember(req: Request): Promise<{ privyUserId: string; member: MemberRow | null }> {
  const privyUserId = await verifyRequest(req)
  const member = await db().query.members.findFirst({ where: eq(schema.members.privyUserId, privyUserId) })
  return { privyUserId, member: member ?? null }
}

/**
 * Requires someone who can approve new members: the treasurer, or the
 * president while the society has no active treasurer yet (otherwise the
 * first members could never be approved).
 */
export async function requireFeeApprover(req: Request): Promise<MemberRow> {
  const member = await requireMember(req, ['treasurer', 'president'])
  if (member.role === 'treasurer') return member
  const treasurer = await db().query.members.findFirst({ where: and(eq(schema.members.role, 'treasurer'), eq(schema.members.status, 'active')) })
  if (treasurer) throw new ApiError(403, 'The treasurer approves new members.')
  return member
}

/**
 * Requires an active member (fee confirmed, pass issued), optionally with one
 * of the given roles. Every permission check in the API goes through here.
 */
export async function requireMember(req: Request, roles?: Role[]): Promise<MemberRow> {
  const { member } = await currentMember(req)
  if (!member) throw new ApiError(403, 'Finish signing up first.')
  if (member.status !== 'active') throw new ApiError(403, 'Your membership is waiting for the treasurer to confirm your fee.')
  if (roles && !roles.includes(member.role)) throw new ApiError(403, `Only the ${roles.join(' or ')} can do this.`)
  return member
}
