import { sql } from 'drizzle-orm'
import { check, customType, index, integer, pgEnum, pgTable, primaryKey, serial, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// Money is stored in integer cents to avoid floating-point rounding.
// Records are append-only: the API has no edit or delete for requests, votes,
// receipts or activity, matching the "nobody can edit past records" rule.

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
})

export const roleEnum = pgEnum('role', ['president', 'treasurer', 'committee', 'student'])
export const memberStatusEnum = pgEnum('member_status', ['pending', 'active'])
export const feeMethodEnum = pgEnum('fee_method', ['cash', 'card', 'bank', 'waived'])
export const requestStatusEnum = pgEnum('request_status', ['voting', 'approved', 'auto', 'rejected', 'spent'])
export const voteChoiceEnum = pgEnum('vote_choice', ['yes', 'no'])
export const activityKindEnum = pgEnum('activity_kind', ['vote', 'request', 'pass', 'spent', 'checkin', 'settings', 'decision'])

/** One row for now. The id column leaves room for multiple societies later. */
export const societies = pgTable('societies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  term: text('term').notNull(),
  approvalPercent: integer('approval_percent').notNull().default(50),
  autoApproveLimitCents: integer('auto_approve_limit_cents').notNull().default(2000),
  membershipFeeCents: integer('membership_fee_cents').notNull().default(1500),
  openingBalanceCents: integer('opening_balance_cents').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const members = pgTable(
  'members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    privyUserId: text('privy_user_id').notNull().unique(),
    email: text('email').notNull(),
    name: text('name'),
    nearAccountId: text('near_account_id'),
    role: roleEnum('role').notNull().default('student'),
    status: memberStatusEnum('status').notNull().default('pending'),
    passNumber: integer('pass_number').unique(),
    feeMethod: feeMethodEnum('fee_method'),
    feeAmountCents: integer('fee_amount_cents').notNull().default(0),
    feeConfirmedAt: timestamp('fee_confirmed_at', { withTimezone: true }),
    feeConfirmedBy: uuid('fee_confirmed_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('members_email_idx').on(t.email)],
)

export const spendRequests = pgTable(
  'spend_requests',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    category: text('category').notNull(),
    amountCents: integer('amount_cents').notNull(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => members.id),
    status: requestStatusEnum('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    /** Filled in once the request is recorded on NEAR. */
    txHash: text('tx_hash'),
  },
  (t) => [check('amount_positive', sql`${t.amountCents} > 0`)],
)

export const votes = pgTable(
  'votes',
  {
    requestId: integer('request_id')
      .notNull()
      .references(() => spendRequests.id),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    choice: voteChoiceEnum('choice').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    txHash: text('tx_hash'),
  },
  // One vote per member per request, enforced by the database.
  (t) => [primaryKey({ columns: [t.requestId, t.memberId] })],
)

export const receipts = pgTable('receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: integer('request_id')
    .notNull()
    .unique()
    .references(() => spendRequests.id),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  /** SHA-256 of the file, so the copy on NEAR can prove it hasn't changed. */
  sha256: text('sha256').notNull(),
  data: bytea('data').notNull(),
  uploadedBy: uuid('uploaded_by')
    .notNull()
    .references(() => members.id),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  txHash: text('tx_hash'),
})

export const feeProofStatusEnum = pgEnum('fee_proof_status', ['reviewing', 'accepted', 'rejected'])

/**
 * A student's proof that they paid the membership fee. Each attempt is a new
 * row, so a rejected submission stays on record when they try again.
 */
export const feeProofs = pgTable(
  'fee_proofs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    method: feeMethodEnum('method').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    sha256: text('sha256').notNull(),
    data: bytea('data').notNull(),
    status: feeProofStatusEnum('status').notNull().default('reviewing'),
    reviewNote: text('review_note'),
    reviewedBy: uuid('reviewed_by').references(() => members.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('fee_proofs_member_idx').on(t.memberId, t.submittedAt)],
)

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => members.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const checkins = pgTable(
  'checkins',
  {
    eventId: integer('event_id')
      .notNull()
      .references(() => events.id),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.memberId] })],
)

export const activity = pgTable(
  'activity',
  {
    id: serial('id').primaryKey(),
    kind: activityKindEnum('kind').notNull(),
    text: text('text').notNull(),
    actorId: uuid('actor_id').references(() => members.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    txHash: text('tx_hash'),
  },
  (t) => [index('activity_created_idx').on(t.createdAt)],
)

export type MemberRow = typeof members.$inferSelect
export type FeeProofRow = typeof feeProofs.$inferSelect
export type SocietyRow = typeof societies.$inferSelect
export type RequestRow = typeof spendRequests.$inferSelect
