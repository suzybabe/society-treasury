import 'server-only'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { COMMITTEE_ROLES } from '@/lib/rules'
import type { Me, Member, Settings, TreasuryState } from '@/lib/types'
import { db, schema, type Tx } from './db'
import type { MemberRow, SocietyRow } from './db/schema'
import { toEuros } from './http'

const { societies, members, spendRequests, votes, receipts, events, checkins, activity } = schema

const DEFAULT_SOCIETY = {
  name: process.env.SOCIETY_NAME || 'Computing Society',
  shortName: process.env.SOCIETY_SHORT_NAME || 'COMPSOC',
  term: process.env.SOCIETY_TERM || '2026/27',
}

/** Returns the society, creating it with defaults on first use. */
export async function getSociety(tx: Tx | ReturnType<typeof db> = db()): Promise<SocietyRow> {
  const existing = await tx.query.societies.findFirst({ orderBy: asc(societies.id) })
  if (existing) return existing
  const [created] = await tx.insert(societies).values(DEFAULT_SOCIETY).onConflictDoNothing().returning()
  return created ?? (await tx.query.societies.findFirst({ orderBy: asc(societies.id) }))!
}

export const toSettings = (s: SocietyRow): Settings => ({
  societyName: s.name,
  shortName: s.shortName,
  term: s.term,
  approvalPercent: s.approvalPercent,
  autoApproveLimit: toEuros(s.autoApproveLimitCents),
  membershipFee: toEuros(s.membershipFeeCents),
  openingBalance: toEuros(s.openingBalanceCents),
})

export const toMe = (m: MemberRow): Me => ({
  id: m.id,
  name: m.name,
  email: m.email,
  role: m.role,
  status: m.status,
  near: m.nearAccountId,
  passId: m.passNumber,
  joinedAt: (m.feeConfirmedAt ?? m.createdAt).toISOString(),
})

export const toMember = (m: MemberRow): Member => ({
  id: m.id,
  name: m.name ?? m.email,
  email: m.email,
  role: m.role,
  near: m.nearAccountId,
  passId: m.passNumber ?? 0,
  joinedAt: (m.feeConfirmedAt ?? m.createdAt).toISOString(),
})

export const requestRef = (id: number) => `REQ-${String(id).padStart(4, '0')}`

/** Parses "REQ-0042" or "42" into the numeric id. */
export function parseRequestRef(ref: string): number | null {
  const n = Number(ref.replace(/^REQ-/i, ''))
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function logActivity(tx: Tx, kind: (typeof activity.$inferInsert)['kind'], text: string, actorId: string | null) {
  await tx.insert(activity).values({ kind, text, actorId })
}

/** Active committee members, used to work out who can vote. */
export async function committeeMembers(tx: Tx | ReturnType<typeof db> = db()) {
  return tx.query.members.findMany({ where: and(eq(members.status, 'active'), inArray(members.role, COMMITTEE_ROLES)) })
}

export async function nextPassNumber(tx: Tx): Promise<number> {
  const [row] = await tx.select({ max: sql<number | null>`max(${members.passNumber})` }).from(members)
  return (row?.max ?? 0) + 1
}

/** Builds everything the signed-in member's screens need. */
export async function buildState(me: MemberRow): Promise<TreasuryState> {
  const d = db()
  const society = await getSociety(d)

  const [memberRows, requestRows, voteRows, receiptRows, eventRows, checkinRows, myCheckins, activityRows, pendingRows] = await Promise.all([
    d.query.members.findMany({ where: eq(members.status, 'active'), orderBy: asc(members.passNumber) }),
    d.query.spendRequests.findMany({ orderBy: desc(spendRequests.id) }),
    d.query.votes.findMany({ orderBy: asc(votes.createdAt) }),
    // Receipt metadata only. The file itself is served by /api/receipts/[id].
    d
      .select({ id: receipts.id, requestId: receipts.requestId, fileName: receipts.fileName, mimeType: receipts.mimeType, sha256: receipts.sha256, uploadedAt: receipts.uploadedAt, uploadedBy: receipts.uploadedBy, txHash: receipts.txHash })
      .from(receipts),
    d.query.events.findMany({ orderBy: asc(events.startsAt) }),
    d.select({ eventId: checkins.eventId, count: sql<number>`count(*)::int` }).from(checkins).groupBy(checkins.eventId),
    d.select({ eventId: checkins.eventId }).from(checkins).where(eq(checkins.memberId, me.id)),
    d.query.activity.findMany({ orderBy: desc(activity.createdAt), limit: 50 }),
    me.role === 'treasurer' ? d.query.members.findMany({ where: eq(members.status, 'pending'), orderBy: asc(members.createdAt) }) : Promise.resolve([]),
  ])

  const votesByRequest = new Map<number, typeof voteRows>()
  for (const v of voteRows) votesByRequest.set(v.requestId, [...(votesByRequest.get(v.requestId) ?? []), v])
  const receiptByRequest = new Map(receiptRows.map((r) => [r.requestId, r]))
  const attendance = new Map(checkinRows.map((c) => [c.eventId, c.count]))
  const mine = new Set(myCheckins.map((c) => c.eventId))

  const requests = requestRows.map((r) => {
    const receipt = receiptByRequest.get(r.id)
    return {
      id: requestRef(r.id),
      title: r.title,
      description: r.description,
      category: r.category as TreasuryState['requests'][number]['category'],
      amount: toEuros(r.amountCents),
      requesterId: r.requesterId,
      createdAt: r.createdAt.toISOString(),
      status: r.status,
      tx: r.txHash ?? undefined,
      decidedAt: r.decidedAt?.toISOString(),
      votes: (votesByRequest.get(r.id) ?? []).map((v) => ({ memberId: v.memberId, choice: v.choice, at: v.createdAt.toISOString(), tx: v.txHash ?? undefined })),
      receipt: receipt && {
        id: receipt.id,
        fileName: receipt.fileName,
        mimeType: receipt.mimeType,
        sha256: receipt.sha256,
        uploadedAt: receipt.uploadedAt.toISOString(),
        paidBy: receipt.uploadedBy,
        tx: receipt.txHash ?? undefined,
      },
    }
  })

  const sum = (rows: typeof requestRows, ...statuses: string[]) => rows.filter((r) => statuses.includes(r.status)).reduce((s, r) => s + r.amountCents, 0)
  const collectedCents = memberRows.reduce((s, m) => s + m.feeAmountCents, 0)
  const spentCents = sum(requestRows, 'spent')

  return {
    me: toMember(me),
    settings: toSettings(society),
    totals: {
      balance: toEuros(society.openingBalanceCents + collectedCents - spentCents),
      collected: toEuros(collectedCents),
      spent: toEuros(spentCents),
      committed: toEuros(sum(requestRows, 'approved', 'auto')),
      underVote: toEuros(sum(requestRows, 'voting')),
      carriedOver: toEuros(society.openingBalanceCents),
      passes: memberRows.length,
    },
    members: memberRows.map(toMember),
    requests,
    payments: pendingRows.map((m) => ({ id: m.id, name: m.name ?? m.email, email: m.email, submittedAt: m.createdAt.toISOString() })),
    events: eventRows.map((e) => ({ id: String(e.id), name: e.name, date: e.startsAt.toISOString(), location: e.location, attendees: attendance.get(e.id) ?? 0, checkedIn: mine.has(e.id) })),
    activity: activityRows.map((a) => ({ id: String(a.id), kind: a.kind, text: a.text, at: a.createdAt.toISOString(), tx: a.txHash ?? undefined })),
  }
}
