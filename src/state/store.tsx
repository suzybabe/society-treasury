'use client'

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import {
  carriedOver,
  seedActivity,
  seedEvents,
  initialFeesCollected,
  seedMembers,
  seedPayments,
  seedRequests,
  initialSettings,
} from '../lib/mock'
import { freshTx } from '../lib/chain'
import { eur, passNo } from '../lib/format'
import { decide } from '../lib/rules'
import type { Activity, ActivityKind, Category, FeePayment, Member, Role, Settings, SocietyEvent, SpendRequest } from '../lib/types'

export interface Toast {
  id: number
  text: string
  tone: 'ok' | 'info' | 'warn'
  tx?: string
}

interface NewRequest {
  title: string
  description: string
  category: Category
  amount: number
}

interface TreasuryStore {
  me: Member | null
  members: Member[]
  requests: SpendRequest[]
  payments: FeePayment[]
  events: SocietyEvent[]
  activity: Activity[]
  settings: Settings
  totals: { balance: number; collected: number; spent: number; committed: number; underVote: number; carriedOver: number; passes: number }
  checkedIn: (eventId: string) => boolean
  toasts: Toast[]

  login: (memberId: string) => void
  logout: () => void
  castVote: (requestId: string, choice: 'yes' | 'no') => void
  submitRequest: (r: NewRequest) => string | null
  confirmFee: (paymentId: string) => void
  markSpent: (requestId: string, file: File | null) => void
  checkIn: (eventId: string) => void
  updateSettings: (s: Settings) => void
  setMemberRole: (memberId: string, role: Role) => void
  handover: (nextPresidentId: string) => void
  dismissToast: (id: number) => void
}

const Ctx = createContext<TreasuryStore | null>(null)

const ME_KEY = 'treasury.me'
const readMe = () => {
  // Demo convenience: ?as=m1 opens the app signed in as that member.
  const as = new URLSearchParams(window.location.search).get('as')
  if (as && seedMembers().some((m) => m.id === as)) {
    writeMe(as)
    return as
  }
  try {
    return localStorage.getItem(ME_KEY)
  } catch {
    return null
  }
}
const writeMe = (id: string | null) => {
  try {
    if (id) localStorage.setItem(ME_KEY, id)
    else localStorage.removeItem(ME_KEY)
  } catch {
    /* storage unavailable: session-only login */
  }
}

let toastSeq = 0

const subscribeNoop = () => () => {}

/**
 * The demo keeps its data and the signed-in member in the browser, and the mock
 * dates are relative to "now". So the store only exists after the page mounts.
 * On the server (and during hydration) the context is null: layouts still
 * render their children, and <StoreReady> keeps data views empty until then.
 */
export function TreasuryProvider({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false)
  return mounted ? <LiveTreasury>{children}</LiveTreasury> : <Ctx.Provider value={null}>{children}</Ctx.Provider>
}

/** Renders its children only once the browser-side store is ready. */
export function StoreReady({ children }: { children: ReactNode }) {
  return useContext(Ctx) ? <>{children}</> : null
}

function LiveTreasury({ children }: { children: ReactNode }) {
  const [meId, setMeId] = useState<string | null>(readMe)
  const [members, setMembers] = useState(seedMembers)
  const [requests, setRequests] = useState(seedRequests)
  const [payments, setPayments] = useState(seedPayments)
  const [events, setEvents] = useState(seedEvents)
  const [activity, setActivity] = useState(seedActivity)
  const [settings, setSettings] = useState(initialSettings)
  const [feesCollected, setFeesCollected] = useState(initialFeesCollected)
  const [passes, setPasses] = useState(127)
  const [checkIns, setCheckIns] = useState<Record<string, string[]>>({ m6: [] })
  const [toasts, setToasts] = useState<Toast[]>([])

  const me = members.find((m) => m.id === meId) ?? null

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok', tx?: string) => {
    const id = ++toastSeq
    setToasts((t) => [...t, { id, text, tone, tx }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const log = useCallback((kind: ActivityKind, text: string, tx: string) => {
    setActivity((a) => [{ id: `a${Date.now()}${Math.random()}`, kind, text, at: new Date().toISOString(), tx }, ...a])
  }, [])

  const totals = useMemo(() => {
    const spent = requests.filter((r) => r.status === 'spent').reduce((s, r) => s + r.amount, 0)
    const committed = requests.filter((r) => r.status === 'approved' || r.status === 'auto').reduce((s, r) => s + r.amount, 0)
    const underVote = requests.filter((r) => r.status === 'voting').reduce((s, r) => s + r.amount, 0)
    return { balance: carriedOver + feesCollected - spent, collected: feesCollected, spent, committed, underVote, carriedOver, passes }
  }, [requests, feesCollected, passes])

  const login = (id: string) => {
    setMeId(id)
    writeMe(id)
  }
  const logout = () => {
    setMeId(null)
    writeMe(null)
  }

  const castVote: TreasuryStore['castVote'] = (requestId, choice) => {
    if (!me) return
    const req = requests.find((r) => r.id === requestId)
    if (!req || req.status !== 'voting' || req.requesterId === me.id || req.votes.some((v) => v.memberId === me.id)) return
    const tx = freshTx('vote')
    const now = new Date().toISOString()
    const next: SpendRequest = { ...req, votes: [...req.votes, { memberId: me.id, choice, at: now, tx }] }
    next.status = decide(next, members, settings)
    if (next.status !== 'voting') next.decidedAt = now
    setRequests((rs) => rs.map((r) => (r.id === requestId ? next : r)))
    log('vote', `${me.name} voted ${choice.toUpperCase()} on ${req.id}`, tx)
    if (next.status === 'approved') {
      log('decision', `${req.id} approved by committee vote`, tx)
      toast(`${req.id} approved. It's ready for the treasurer to pay.`, 'ok', tx)
    } else if (next.status === 'rejected') {
      log('decision', `${req.id} rejected by committee vote`, tx)
      toast(`${req.id} rejected by the committee.`, 'warn', tx)
    } else {
      toast(`Vote recorded on NEAR`, 'ok', tx)
    }
  }

  const submitRequest: TreasuryStore['submitRequest'] = ({ title, description, category, amount }) => {
    if (!me) return null
    const num = Math.max(...requests.map((r) => Number(r.id.slice(4)))) + 1
    const id = `REQ-${String(num).padStart(4, '0')}`
    const tx = freshTx('req')
    const now = new Date().toISOString()
    const auto = amount < settings.autoApproveLimit
    const req: SpendRequest = {
      id,
      title,
      description,
      category,
      amount,
      requesterId: me.id,
      createdAt: now,
      status: auto ? 'auto' : 'voting',
      votes: [],
      tx,
      decidedAt: auto ? now : undefined,
    }
    setRequests((rs) => [req, ...rs])
    log('request', `${me.name} requested ${eur(amount)} for ${title}`, tx)
    if (auto) log('decision', `${id} auto-approved (under ${eur(settings.autoApproveLimit)})`, tx)
    toast(auto ? `${id} auto-approved: it's under ${eur(settings.autoApproveLimit)}` : `${id} submitted to the committee vote`, 'ok', tx)
    return id
  }

  const confirmFee: TreasuryStore['confirmFee'] = (paymentId) => {
    const p = payments.find((x) => x.id === paymentId)
    if (!p) return
    const passId = passes + 1
    const tx = freshTx('pass')
    const first = p.name.split(' ')[0].toLowerCase()
    setMembers((ms) => [
      ...ms,
      { id: `m${Date.now()}`, name: p.name, email: p.email, role: 'student', near: `${first}.${settings.shortName.toLowerCase()}.testnet`, passId, joinedAt: new Date().toISOString() },
    ])
    setPayments((ps) => ps.filter((x) => x.id !== paymentId))
    setPasses(passId)
    setFeesCollected((f) => f + p.amount)
    log('pass', `Fee confirmed. Pass ${passNo(passId)} minted to ${p.name}`, tx)
    toast(`Pass ${passNo(passId)} minted to ${p.name}`, 'ok', tx)
  }

  const markSpent: TreasuryStore['markSpent'] = (requestId, file) => {
    if (!me || !file) return
    const tx = freshTx('rcpt')
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    setRequests((rs) =>
      rs.map((r) =>
        r.id === requestId
          ? { ...r, status: 'spent', receipt: { fileName: file.name, uploadedAt: new Date().toISOString(), paidBy: me.id, tx, previewUrl } }
          : r,
      ),
    )
    log('spent', `Receipt uploaded for ${requestId}, marked Spent`, tx)
    toast(`${requestId} marked Spent. Receipt stored on-chain.`, 'ok', tx)
  }

  const checkIn: TreasuryStore['checkIn'] = (eventId) => {
    if (!me) return
    const ev = events.find((e) => e.id === eventId)
    if (!ev || checkIns[me.id]?.includes(eventId)) return
    const tx = freshTx('checkin')
    setCheckIns((c) => ({ ...c, [me.id]: [...(c[me.id] ?? []), eventId] }))
    setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, attendees: e.attendees + 1 } : e)))
    log('checkin', `${me.name} checked in to ${ev.name}`, tx)
    toast(`Checked in to ${ev.name}`, 'ok', tx)
  }

  const updateSettings: TreasuryStore['updateSettings'] = (s) => {
    const tx = freshTx('settings')
    setSettings(s)
    log('settings', `Voting rules updated: >${s.approvalPercent}% to pass, auto-approve under ${eur(s.autoApproveLimit)}`, tx)
    toast('Settings saved and recorded on NEAR', 'ok', tx)
  }

  const setMemberRole: TreasuryStore['setMemberRole'] = (memberId, role) => {
    const m = members.find((x) => x.id === memberId)
    if (!m || m.role === role || role === 'president') return
    const tx = freshTx('role')
    setMembers((ms) =>
      ms.map((x) => {
        if (x.id === memberId) return { ...x, role }
        // Only one treasurer at a time: the old one becomes a committee member.
        if (role === 'treasurer' && x.role === 'treasurer') return { ...x, role: 'committee' }
        return x
      }),
    )
    log('settings', `${m.name} is now ${role}`, tx)
    toast(`${m.name} is now ${role}`, 'info', tx)
  }

  const handover: TreasuryStore['handover'] = (nextId) => {
    if (!me || me.role !== 'president') return
    const next = members.find((m) => m.id === nextId)
    if (!next) return
    const tx = freshTx('handover')
    const [a, b] = settings.term.split('/').map(Number)
    const term = `${a + 1}/${b + 1}`
    setMembers((ms) => ms.map((m) => (m.id === nextId ? { ...m, role: 'president' } : m.id === me.id ? { ...m, role: 'student' } : m)))
    setSettings((s) => ({ ...s, term }))
    log('settings', `Handover: ${next.name} is president for ${term}. Full history carried over.`, tx)
    toast(`Handed over to ${next.name}. Every record stays on-chain.`, 'info', tx)
  }

  const value: TreasuryStore = {
    me,
    members,
    requests,
    payments,
    events,
    activity,
    settings,
    totals,
    checkedIn: (eventId) => !!me && !!checkIns[me.id]?.includes(eventId),
    toasts,
    login,
    logout,
    castVote,
    submitRequest,
    confirmFee,
    markSpent,
    checkIn,
    updateSettings,
    setMemberRole,
    handover,
    dismissToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTreasury() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTreasury needs the store: wrap the component in <StoreReady>')
  return ctx
}

/** The store, or null before the page has mounted. */
export const useTreasuryOptional = () => useContext(Ctx)

export function useMe() {
  const { me } = useTreasury()
  if (!me) throw new Error('useMe called while signed out')
  return me
}

export const memberById = (members: Member[], id: string) => members.find((m) => m.id === id)
