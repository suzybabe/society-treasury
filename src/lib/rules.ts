import type { Member, Role, SpendRequest, Settings, Status } from './types'

// These rules mirror the NEAR contract exactly, so the app and the chain
// always reach the same decision.

export const COMMITTEE_ROLES: Role[] = ['president', 'treasurer', 'committee']

export const isCommittee = (role?: Role) => !!role && COMMITTEE_ROLES.includes(role)

/** Everyone on the committee except the person who made the request. */
export const eligibleVoters = <T extends Pick<Member, 'id' | 'role'>>(req: Pick<SpendRequest, 'requesterId'>, members: T[]): T[] =>
  members.filter((m) => isCommittee(m.role) && m.id !== req.requesterId)

/** Members with a pass who aren't on the committee. */
export const studentCount = (members: Pick<Member, 'role'>[]) => members.filter((m) => !isCommittee(m.role)).length

/**
 * Yes votes needed to pass. It's "more than X percent" of the seats, and
 * never fewer than 2, so no one can approve spending alone.
 */
export function requiredYes(seats: number, approvalPercent: number) {
  const need = Math.floor((seats * approvalPercent) / 100) + 1
  return Math.min(Math.max(need, 2), Math.max(seats, 2))
}

/**
 * The students' combined vote: their majority, once at least `quorum`
 * students have voted. A tie (or too few votes) counts as nothing yet.
 */
export function studentBloc(yes: number, no: number, quorum: number): boolean | null {
  if (yes + no < Math.max(quorum, 1)) return null
  if (yes > no) return true
  if (no > yes) return false
  return null
}

/**
 * The students' seat only exists when there are enough students to reach the
 * quorum, so requests never wait on a student vote that can't happen.
 */
export const hasStudentSeat = (members: Pick<Member, 'role'>[], settings: Pick<Settings, 'studentQuorum'>) =>
  studentCount(members) >= settings.studentQuorum

/** How many votes a request by this member would have: other committee members, plus the student seat. */
export function votingSeats(requesterId: string, members: Pick<Member, 'id' | 'role'>[], settings: Pick<Settings, 'studentQuorum'>) {
  return eligibleVoters({ requesterId }, members).length + (hasStudentSeat(members, settings) ? 1 : 0)
}

/** A request needs at least two seats that can vote on it. */
export const MIN_VOTING_SEATS = 2

type TallyRequest = Pick<SpendRequest, 'requesterId' | 'votes' | 'studentPoll'>

export function tally<T extends Pick<Member, 'id' | 'role'>>(req: TallyRequest, members: T[], settings: Pick<Settings, 'approvalPercent' | 'studentQuorum'>) {
  const eligible = eligibleVoters(req, members)
  const studentSeat = hasStudentSeat(members, settings)
  const seats = eligible.length + (studentSeat ? 1 : 0)
  const need = requiredYes(seats, settings.approvalPercent)
  const committeeYes = req.votes.filter((v) => v.choice === 'yes').length
  const committeeNo = req.votes.filter((v) => v.choice === 'no').length
  const bloc = studentSeat ? studentBloc(req.studentPoll.yes, req.studentPoll.no, settings.studentQuorum) : null
  const yes = committeeYes + (bloc === true ? 1 : 0)
  const no = committeeNo + (bloc === false ? 1 : 0)
  return { eligible, studentSeat, seats, need, committeeYes, committeeNo, bloc, yes, no, remaining: seats - yes - no }
}

export function decide(req: TallyRequest, members: Pick<Member, 'id' | 'role'>[], settings: Pick<Settings, 'approvalPercent' | 'studentQuorum'>): Status {
  const { seats, need, yes, no } = tally(req, members, settings)
  if (yes >= need) return 'approved'
  // Matches the contract exactly (it uses a saturating subtraction).
  if (no > Math.max(0, seats - need)) return 'rejected'
  return 'voting'
}

export type VoteBlock = 'student' | 'own' | 'voted' | 'closed' | null

/** Why the given member can't vote as committee on this request, or null if they can. */
export function voteBlock(req: SpendRequest, me: Member): VoteBlock {
  if (!isCommittee(me.role)) return 'student'
  if (req.status !== 'voting') return 'closed'
  if (req.requesterId === me.id) return 'own'
  if (req.votes.some((v) => v.memberId === me.id)) return 'voted'
  return null
}

export const VOTE_BLOCK_TEXT: Record<Exclude<VoteBlock, null>, string> = {
  student: 'Students vote in the student vote below.',
  own: 'You can’t vote on your own request.',
  voted: 'Your vote is recorded on-chain and can’t be changed.',
  closed: 'Voting is closed for this request.',
}

/** Whether this member can cast a student vote on the request right now. */
export const canStudentVote = (req: SpendRequest, me: Member) => !isCommittee(me.role) && req.status === 'voting' && req.studentPoll.mine === null
