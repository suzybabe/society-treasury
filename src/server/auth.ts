import 'server-only'
import { eq } from 'drizzle-orm'
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
