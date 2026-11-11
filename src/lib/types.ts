// Shapes shared by the API (src/app/api) and the UI. Money is in euros here;
// the database stores cents. `tx` fields stay empty until the NEAR contract
// records the item on-chain.

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
}

export interface Vote {
  memberId: string
  choice: 'yes' | 'no'
  at: string
  tx?: string
}

export interface Receipt {
  id: string
  fileName: string
  mimeType: string
  sha256: string
  uploadedAt: string
  paidBy: string
  tx?: string
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
  decidedAt?: string
  receipt?: Receipt
}

/** Someone who signed up and is waiting for the treasurer to confirm their fee. */
export interface FeePayment {
  id: string
  name: string
  email: string
  submittedAt: string
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
  /** Only filled for the treasurer. */
  payments: FeePayment[]
  events: SocietyEvent[]
  activity: Activity[]
}
