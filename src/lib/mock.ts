// Mock data for the demo. Dates are relative to "now", so the seed* functions
// are called in the browser only (Next.js forbids Date.now() during prerender).
import { txHash } from './chain'
import { daysAgo, daysFromNow } from './format'
import type { Activity, FeePayment, Member, Settings, SocietyEvent, SpendRequest, Vote } from './types'

export const initialSettings: Settings = {
  societyName: 'Computing Society',
  shortName: 'COMPSOC',
  term: '2026/27',
  approvalPercent: 50,
  autoApproveLimit: 20,
  membershipFee: 15,
}

const acct = (first: string) => `${first.toLowerCase()}.compsoc.testnet`

export const seedMembers = (): Member[] => [
  { id: 'm1', name: 'Amara Okafor', email: 'amara@uni.edu', role: 'president', near: acct('amara'), passId: 1, joinedAt: daysAgo(70) },
  { id: 'm2', name: 'Liam Chen', email: 'liam@uni.edu', role: 'treasurer', near: acct('liam'), passId: 2, joinedAt: daysAgo(70) },
  { id: 'm3', name: 'Sofia Rossi', email: 'sofia@uni.edu', role: 'committee', near: acct('sofia'), passId: 3, joinedAt: daysAgo(68) },
  { id: 'm4', name: 'Noah Becker', email: 'noah@uni.edu', role: 'committee', near: acct('noah'), passId: 4, joinedAt: daysAgo(68) },
  { id: 'm5', name: 'Priya Nair', email: 'priya@uni.edu', role: 'committee', near: acct('priya'), passId: 5, joinedAt: daysAgo(66) },
  { id: 'm6', name: 'Jonas Weber', email: 'jonas@uni.edu', role: 'student', near: acct('jonas'), passId: 58, joinedAt: daysAgo(40) },
  { id: 'm7', name: 'Chloe Martin', email: 'chloe@uni.edu', role: 'student', near: acct('chloe'), passId: 91, joinedAt: daysAgo(25) },
  { id: 'm8', name: 'Diego Alvarez', email: 'diego@uni.edu', role: 'student', near: acct('diego'), passId: 127, joinedAt: daysAgo(6) },
]

/** Accounts offered on the login screen so every role can be tried. */
export const DEMO_ACCOUNTS = ['m1', 'm2', 'm3', 'm6']

const v = (memberId: string, choice: 'yes' | 'no', d: number, h: number): Vote => ({
  memberId,
  choice,
  at: daysAgo(d, h),
  tx: txHash(`vote-${memberId}-${d}-${h}`),
})

export const seedRequests = (): SpendRequest[] => [
  {
    id: 'REQ-0048',
    title: 'Pizza for Hack Night #3',
    description: '12 large pizzas for around 60 attendees. Quote from Luigi’s, delivered to Lab 2 at 19:00. Vegan and gluten-free options included.',
    category: 'Food',
    amount: 86.4,
    requesterId: 'm3',
    createdAt: daysAgo(0, 5),
    status: 'voting',
    votes: [v('m1', 'yes', 0, 4), v('m2', 'yes', 0, 2)],
    tx: txHash('req-48'),
  },
  {
    id: 'REQ-0047',
    title: 'Printer filament (PLA, 2 kg)',
    description: 'Two spools of black PLA for the makerspace printer. Running low before the robotics workshop.',
    category: 'Equipment',
    amount: 14.99,
    requesterId: 'm4',
    createdAt: daysAgo(1, 3),
    status: 'auto',
    votes: [],
    tx: txHash('req-47'),
    decidedAt: daysAgo(1, 3),
  },
  {
    id: 'REQ-0046',
    title: 'Cloud credits for project servers',
    description: 'Monthly hosting for the three member projects (Discord bot, timetable app, society website). Keeps them online through exams.',
    category: 'Software',
    amount: 95,
    requesterId: 'm2',
    createdAt: daysAgo(2, 6),
    status: 'voting',
    votes: [v('m3', 'yes', 2, 1)],
    tx: txHash('req-46'),
  },
  {
    id: 'REQ-0045',
    title: 'Arduino starter kits ×6',
    description: 'Six starter kits for the beginner hardware track. They stay society property and can be borrowed by any member.',
    category: 'Equipment',
    amount: 174,
    requesterId: 'm5',
    createdAt: daysAgo(4, 2),
    status: 'approved',
    votes: [v('m1', 'yes', 4, 1), v('m4', 'no', 3, 20), v('m2', 'yes', 3, 18), v('m3', 'yes', 3, 9)],
    tx: txHash('req-45'),
    decidedAt: daysAgo(3, 9),
  },
  {
    id: 'REQ-0044',
    title: 'Guest speaker train ticket',
    description: 'Return train ticket for our Rust talk speaker travelling in from Dublin.',
    category: 'Travel',
    amount: 62.5,
    requesterId: 'm1',
    createdAt: daysAgo(9),
    status: 'spent',
    votes: [v('m2', 'yes', 8, 20), v('m3', 'yes', 8, 14), v('m5', 'yes', 8, 9)],
    tx: txHash('req-44'),
    decidedAt: daysAgo(8, 9),
    receipt: { fileName: 'irishrail-ticket.pdf', uploadedAt: daysAgo(7), paidBy: 'm2', tx: txHash('rcpt-44') },
  },
  {
    id: 'REQ-0043',
    title: 'Branded hoodies (committee only)',
    description: '10 embroidered hoodies for committee members.',
    category: 'Other',
    amount: 320,
    requesterId: 'm4',
    createdAt: daysAgo(12),
    status: 'rejected',
    votes: [v('m2', 'no', 11, 22), v('m5', 'yes', 11, 18), v('m1', 'no', 11, 10)],
    tx: txHash('req-43'),
    decidedAt: daysAgo(11, 10),
  },
  {
    id: 'REQ-0042',
    title: 'Room booking for the Freshers’ social',
    description: 'Student union bar function room, 3 hours.',
    category: 'Events',
    amount: 45,
    requesterId: 'm3',
    createdAt: daysAgo(18),
    status: 'spent',
    votes: [v('m1', 'yes', 17, 22), v('m2', 'yes', 17, 20), v('m4', 'yes', 17, 11)],
    tx: txHash('req-42'),
    decidedAt: daysAgo(17, 11),
    receipt: { fileName: 'su-booking-invoice.pdf', uploadedAt: daysAgo(15), paidBy: 'm2', tx: txHash('rcpt-42') },
  },
  {
    id: 'REQ-0041',
    title: 'Coffee & snacks for the Git workshop',
    description: 'Coffee, biscuits and fruit for 25 people.',
    category: 'Food',
    amount: 18.2,
    requesterId: 'm5',
    createdAt: daysAgo(21),
    status: 'spent',
    votes: [],
    tx: txHash('req-41'),
    decidedAt: daysAgo(21),
    receipt: { fileName: 'tesco-receipt.jpg', uploadedAt: daysAgo(20), paidBy: 'm2', tx: txHash('rcpt-41') },
  },
  {
    id: 'REQ-0040',
    title: 'Domain renewal: compsoc.dev',
    description: 'Annual renewal for the society domain.',
    category: 'Software',
    amount: 12,
    requesterId: 'm2',
    createdAt: daysAgo(30),
    status: 'spent',
    votes: [],
    tx: txHash('req-40'),
    decidedAt: daysAgo(30),
    receipt: { fileName: 'namecheap-invoice.pdf', uploadedAt: daysAgo(30), paidBy: 'm2', tx: txHash('rcpt-40') },
  },
]

export const seedPayments = (): FeePayment[] => [
  { id: 'p1', name: 'Hannah Kowalski', email: 'hannah@uni.edu', method: 'bank', amount: 15, submittedAt: daysAgo(0, 3) },
  { id: 'p2', name: 'Kofi Mensah', email: 'kofi@uni.edu', method: 'cash', amount: 15, submittedAt: daysAgo(0, 9) },
  { id: 'p3', name: 'Ines Duarte', email: 'ines@uni.edu', method: 'card', amount: 15, submittedAt: daysAgo(1, 4) },
]

export const seedEvents = (): SocietyEvent[] => [
  { id: 'e1', name: 'Hack Night #3', date: daysFromNow(4, 19), location: 'Engineering Lab 2', attendees: 41 },
  { id: 'e2', name: 'Intro to Rust workshop', date: daysFromNow(10, 17), location: 'Room CS-104', attendees: 18 },
  { id: 'e3', name: 'Winter social', date: daysFromNow(25, 20), location: 'SU Bar', attendees: 63 },
]

export const seedActivity = (): Activity[] => [
  { id: 'a1', kind: 'vote', text: 'Liam Chen voted YES on REQ-0048', at: daysAgo(0, 2), tx: txHash('vote-m2-0-2') },
  { id: 'a2', kind: 'vote', text: 'Amara Okafor voted YES on REQ-0048', at: daysAgo(0, 4), tx: txHash('vote-m1-0-4') },
  { id: 'a3', kind: 'request', text: 'Sofia Rossi requested €86.40 for Pizza for Hack Night #3', at: daysAgo(0, 5), tx: txHash('req-48') },
  { id: 'a4', kind: 'pass', text: 'Pass #0127 issued to Diego Alvarez', at: daysAgo(0, 20), tx: txHash('pass-127') },
  { id: 'a5', kind: 'decision', text: 'REQ-0047 auto-approved (under €20)', at: daysAgo(1, 3), tx: txHash('req-47') },
  { id: 'a6', kind: 'vote', text: 'Sofia Rossi voted YES on REQ-0046', at: daysAgo(2, 1), tx: txHash('vote-m3-2-1') },
  { id: 'a7', kind: 'decision', text: 'REQ-0045 approved by committee vote (3 of 3 needed)', at: daysAgo(3, 9), tx: txHash('vote-m3-3-9') },
  { id: 'a8', kind: 'spent', text: 'Receipt uploaded for REQ-0044, marked Spent', at: daysAgo(7), tx: txHash('rcpt-44') },
]

/** Fees from 127 passes this term, plus money carried over from last year's committee. */
export const initialFeesCollected = 127 * 15
export const carriedOver = 1240
