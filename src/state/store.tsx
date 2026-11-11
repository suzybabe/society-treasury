'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import useSWR from 'swr'
import { errorMessage } from '../lib/api'
import type { Category, FeeMethod, Member, Role, Settings, TreasuryState } from '../lib/types'
import { useSessionOptional } from './session'

export interface Toast {
  id: number
  text: string
  tone: 'ok' | 'info' | 'warn'
}

interface NewRequest {
  title: string
  description: string
  category: Category
  amount: number
}

interface NewEvent {
  name: string
  location: string
  startsAt: string
}

/** Society data for the signed-in member, plus the actions they can take. */
export interface TreasuryStore extends TreasuryState {
  checkedIn: (eventId: string) => boolean
  toasts: Toast[]
  refresh: () => Promise<unknown>
  castVote: (requestId: string, choice: 'yes' | 'no') => Promise<void>
  /** Students: vote on a request. Their majority counts as one committee vote. */
  studentVote: (requestId: string, choice: 'yes' | 'no') => Promise<void>
  submitRequest: (r: NewRequest) => Promise<string | null>
  confirmFee: (memberId: string, method: FeeMethod) => Promise<void>
  rejectFee: (memberId: string, note: string) => Promise<boolean>
  markSpent: (requestId: string, file: File | null) => Promise<void>
  checkIn: (eventId: string) => Promise<void>
  createEvent: (e: NewEvent) => Promise<boolean>
  updateSettings: (s: Settings) => Promise<void>
  setMemberRole: (memberId: string, role: Role) => Promise<void>
  handover: (nextPresidentId: string) => Promise<void>
  logout: () => Promise<void>
  dismissToast: (id: number) => void
}

const Ctx = createContext<TreasuryStore | null>(null)
let toastSeq = 0

/**
 * Loads GET /api/state for active members. Every action calls the API and
 * then reloads the state, so the screen always shows what the server stored.
 * The context stays null until the data has loaded.
 */
export function TreasuryProvider({ children }: { children: ReactNode }) {
  const session = useSessionOptional()
  const active = session?.status === 'active'
  const { data, mutate } = useSWR<TreasuryState>(active ? '/api/state' : null, (path: string) => session!.api<TreasuryState>(path), {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  })
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = ++toastSeq
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  if (!session || !active || !data) return <Ctx.Provider value={null}>{children}</Ctx.Provider>

  /** Runs an API call, reloads the state, and shows a toast either way. */
  async function act<T>(call: () => Promise<T>, success: string | ((result: T) => string)): Promise<T | null> {
    try {
      const result = await call()
      await mutate()
      toast(typeof success === 'function' ? success(result) : success)
      return result
    } catch (err) {
      toast(errorMessage(err), 'warn')
      return null
    }
  }

  const { api } = session
  const value: TreasuryStore = {
    ...data,
    toasts,
    refresh: () => mutate(),
    checkedIn: (eventId) => !!data.events.find((e) => e.id === eventId)?.checkedIn,
    castVote: async (requestId, choice) => {
      await act(
        () => api<{ status: string }>(`/api/requests/${requestId}/votes`, { json: { choice } }),
        (r) => (r.status === 'approved' ? `${requestId} approved. It's ready for the treasurer to pay.` : r.status === 'rejected' ? `${requestId} rejected by the committee.` : 'Vote recorded'),
      )
    },
    studentVote: async (requestId, choice) => {
      await act(
        () => api<{ status: string }>(`/api/requests/${requestId}/student-votes`, { json: { choice } }),
        (r) => (r.status === 'approved' ? `${requestId} approved, with the student vote counted.` : r.status === 'rejected' ? `${requestId} rejected, with the student vote counted.` : 'Your vote is recorded'),
      )
    },
    submitRequest: async (r) => {
      const res = await act(() => api<{ id: string }>('/api/requests', { json: r }), (res) => `${res.id} submitted`)
      return res?.id ?? null
    },
    confirmFee: async (memberId, method) => {
      await act(() => api<{ passNumber: number }>(`/api/members/${memberId}/confirm-fee`, { json: { method } }), (r) => `Fee confirmed. Pass #${String(r.passNumber).padStart(4, '0')} issued.`)
    },
    rejectFee: async (memberId, note) => !!(await act(() => api(`/api/members/${memberId}/reject-fee`, { json: { note } }), 'Proof rejected. They can send it again.')),
    markSpent: async (requestId, file) => {
      if (!file) return
      const form = new FormData()
      form.append('file', file)
      await act(() => api(`/api/requests/${requestId}/receipt`, { form }), `${requestId} marked Spent`)
    },
    checkIn: async (eventId) => {
      await act(() => api(`/api/events/${eventId}/checkin`, { method: 'POST' }), 'Checked in')
    },
    createEvent: async (e) => !!(await act(() => api('/api/events', { json: e }), `${e.name} added`)),
    updateSettings: async (s) => {
      await act(() => api('/api/society', { method: 'PATCH', json: s }), 'Settings saved')
    },
    setMemberRole: async (memberId, role) => {
      await act(() => api(`/api/members/${memberId}`, { method: 'PATCH', json: { role } }), 'Role updated')
    },
    handover: async (nextPresidentId) => {
      await act(() => api('/api/society/handover', { json: { nextPresidentId } }), 'Handover complete. All records carry over.')
    },
    logout: session.signOut,
    dismissToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Renders its children only once the member's data has loaded. */
export function StoreReady({ children }: { children: ReactNode }) {
  return useContext(Ctx) ? <>{children}</> : null
}

export function useTreasury() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTreasury needs loaded data: wrap the component in <StoreReady>')
  return ctx
}

/** The store, or null while signed out or loading. */
export const useTreasuryOptional = () => useContext(Ctx)

export function useMe(): Member {
  return useTreasury().me
}

export const memberById = (members: Member[], id: string) => members.find((m) => m.id === id)
