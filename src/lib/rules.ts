import type { Member, Role, SpendRequest, Settings, Status } from './types'

export const COMMITTEE_ROLES: Role[] = ['president', 'treasurer', 'committee']

export const isCommittee = (role?: Role) => !!role && COMMITTEE_ROLES.includes(role)

/** Everyone on the committee except the person who made the request. */
export const eligibleVoters = (req: SpendRequest, members: Member[]) =>
  members.filter((m) => isCommittee(m.role) && m.id !== req.requesterId)

/**
 * Yes votes needed to pass. It's "more than X percent" of eligible voters,
 * and never fewer than 2, so no one can approve spending alone.
 */
export function requiredYes(eligible: number, approvalPercent: number) {
  const need = Math.floor((eligible * approvalPercent) / 100) + 1
  return Math.min(Math.max(need, 2), Math.max(eligible, 2))
}

export function tally(req: SpendRequest, members: Member[], settings: Settings) {
  const eligible = eligibleVoters(req, members)
  const need = requiredYes(eligible.length, settings.approvalPercent)
  const yes = req.votes.filter((v) => v.choice === 'yes').length
  const no = req.votes.filter((v) => v.choice === 'no').length
  return { eligible, need, yes, no, remaining: eligible.length - yes - no }
}

/** A request needs at least two people who can vote on it, so 3 committee members in total. */
export const MIN_ELIGIBLE_VOTERS = 2

export function decide(req: SpendRequest, members: Member[], settings: Settings): Status {
  const { eligible, need, yes, no } = tally(req, members, settings)
  if (yes >= need) return 'approved'
  // Matches the contract exactly (it uses a saturating subtraction).
  if (no > Math.max(0, eligible.length - need)) return 'rejected'
  return 'voting'
}

export type VoteBlock = 'student' | 'own' | 'voted' | 'closed' | null

/** Why the given member can't vote on this request, or null if they can. */
export function voteBlock(req: SpendRequest, me: Member): VoteBlock {
  if (!isCommittee(me.role)) return 'student'
  if (req.status !== 'voting') return 'closed'
  if (req.requesterId === me.id) return 'own'
  if (req.votes.some((v) => v.memberId === me.id)) return 'voted'
  return null
}

export const VOTE_BLOCK_TEXT: Record<Exclude<VoteBlock, null>, string> = {
  student: 'Only committee members can vote.',
  own: 'You can’t vote on your own request.',
  voted: 'Your vote is recorded on-chain and can’t be changed.',
  closed: 'Voting is closed for this request.',
}
