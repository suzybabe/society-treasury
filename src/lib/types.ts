export type Role = 'president' | 'treasurer' | 'committee' | 'student'

export type Status = 'voting' | 'approved' | 'auto' | 'rejected' | 'spent'

export type Category = 'Events' | 'Equipment' | 'Food' | 'Travel' | 'Software' | 'Other'

export interface Member {
  id: string
  name: string
  email: string
  role: Role
  near: string
  passId: number
  joinedAt: string
}

export interface Vote {
  memberId: string
  choice: 'yes' | 'no'
  at: string
  tx: string
}

export interface Receipt {
  fileName: string
  uploadedAt: string
  paidBy: string
  tx: string
  previewUrl?: string
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
  tx: string
  decidedAt?: string
  receipt?: Receipt
}

export interface FeePayment {
  id: string
  name: string
  email: string
  method: 'cash' | 'card' | 'bank'
  amount: number
  submittedAt: string
}

export interface SocietyEvent {
  id: string
  name: string
  date: string
  location: string
  attendees: number
}

export type ActivityKind = 'vote' | 'request' | 'pass' | 'spent' | 'checkin' | 'settings' | 'decision'

export interface Activity {
  id: string
  kind: ActivityKind
  text: string
  at: string
  tx: string
}

export interface Settings {
  societyName: string
  shortName: string
  term: string
  approvalPercent: number
  autoApproveLimit: number
  membershipFee: number
}
