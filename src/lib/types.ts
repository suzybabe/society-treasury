// Shapes shared by the API (src/app/api) and the UI. Money is in euros here;
// the database stores cents. `tx` fields stay empty until the NEAR contract
// records the item on-chain.

/** Where a record stands on NEAR. Missing means it isn't recorded on-chain (e.g. check-ins). */
export interface ChainStatus {
  status: 'pending' | 'done' | 'failed'
  tx?: string
  /** Why the contract rejected it, when failed. */
  error?: string
}

/** One contract transaction made by the app, for the public on-chain log. */
export interface ChainLogEntry {
  id: number
  method: string
  label: string
  status: 'pending' | 'done' | 'failed'
  tx?: string
  error?: string
  at: string
}

export type Role = 'president' | 'treasurer' | 'committee' | 'student'

export type Status = 'voting' | 'approved' | 'auto' | 'rejected' | 'spent'

export const CATEGORIES = ['Events', 'Equipment', 'Food', 'Travel', 'Software', 'Other'] as const
export type Category = (typeof CATEGORIES)[number]

export type FeeMethod = 'cash' | 'card' | 'bank'

/** An active member with a pass. */
export interface Member {
  id: string
  name: string
  email: string
  role: Role
  near: string | null
  passId: number
  joinedAt: string
  /** NEAR transaction that minted their pass, once recorded. */
  passTx?: string
  passChain?: ChainStatus
}

/** A student's latest proof-of-payment submission. */
export interface FeeSubmission {
  id: string
  status: 'reviewing' | 'accepted' | 'rejected'
  method: FeeMethod
  fileName: string
  mimeType: string
  submittedAt: string
  /** The treasurer's reason, when rejected. */
  note: string | null
}

/** The signed-in person, who may still be waiting for their fee to be confirmed. */
export interface Me {
  id: string
  name: string | null
  email: string
  role: Role
  status: 'pending' | 'active'
  near: string | null
  passId: number | null
  joinedAt: string
  /** Latest proof of payment, while their membership is pending. */
  feeSubmission: FeeSubmission | null
}

export interface Vote {
  memberId: string
  choice: 'yes' | 'no'
  at: string
  tx?: string
  chain?: ChainStatus
}

export interface Receipt {
  id: string
  fileName: string
  mimeType: string
  sha256: string
  uploadedAt: string
  paidBy: string
  tx?: string
  chain?: ChainStatus
}

export interface SpendRequest {
  id: string
  title: string
  description: string
  category: Category
  amount: number
  requesterId: string
  createdAt: string
  status: Status
  votes: Vote[]
  tx?: string
  chain?: ChainStatus
  decidedAt?: string
  receipt?: Receipt
}

/** Someone who signed up and is waiting for the treasurer to confirm their fee. */
export interface FeePayment {
  id: string
  name: string
  email: string
  submittedAt: string
  /** Their proof of payment, if they've uploaded one that's awaiting review. */
  submission: FeeSubmission | null
}

export interface SocietyEvent {
  id: string
  name: string
  date: string
  location: string
  attendees: number
  checkedIn: boolean
}

export type ActivityKind = 'vote' | 'request' | 'pass' | 'spent' | 'checkin' | 'settings' | 'decision'

export interface Activity {
  id: string
  kind: ActivityKind
  text: string
  at: string
  tx?: string
  chain?: ChainStatus
}

export interface Settings {
  societyName: string
  shortName: string
  term: string
  approvalPercent: number
  autoApproveLimit: number
  membershipFee: number
  openingBalance: number
}

export interface Totals {
  balance: number
  collected: number
  spent: number
  committed: number
  underVote: number
  carriedOver: number
  passes: number
}

/** Everything an active member's screens need, returned by GET /api/state. */
export interface TreasuryState {
  me: Member
  settings: Settings
  totals: Totals
  members: Member[]
  requests: SpendRequest[]
  /** Sign-ups waiting for approval. Filled for the treasurer (who approves) and president (read-only). */
  payments: FeePayment[]
  events: SocietyEvent[]
  activity: Activity[]
  /** Every contract transaction the app has made, newest first. */
  chainLog: ChainLogEntry[]
  contractId: string | null
}
