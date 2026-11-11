'use client'

import { useLoginWithEmail, usePrivy } from '@privy-io/react-auth'
import { useCreateWallet } from '@privy-io/react-auth/extended-chains'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { apiJson, apiRaw, errorMessage, type ApiInit } from '../lib/api'
import type { Me } from '../lib/types'

/**
 * Where the signed-in person is in the sign-up flow:
 * loading → signed-out → setting-up (NEAR wallet + registration) →
 * needs-name → pending (fee not confirmed yet) → active.
 */
export type SessionStatus = 'loading' | 'signed-out' | 'setting-up' | 'needs-name' | 'pending' | 'active' | 'error'

interface Session {
  status: SessionStatus
  me: Me | null
  error: string | null
  sendCode: (email: string) => Promise<void>
  verifyCode: (code: string) => Promise<void>
  saveName: (name: string) => Promise<void>
  /** Sends proof of payment (name, method, file) for the treasurer to review. */
  submitFeeProof: (form: FormData) => Promise<void>
  retry: () => void
  signOut: () => Promise<void>
  /** Calls our API as the signed-in user. */
  api: <T>(path: string, init?: ApiInit) => Promise<T>
  apiResponse: (path: string, init?: ApiInit) => Promise<Response>
}

const Ctx = createContext<Session | null>(null)

const hasNearWallet = (accounts: ReadonlyArray<{ type: string }>) =>
  accounts.some((a) => a.type === 'wallet' && 'chainType' in a && (a as { chainType: string }).chainType === 'near')

export function SessionProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, getAccessToken, logout } = usePrivy()
  const { sendCode: privySendCode, loginWithCode } = useLoginWithEmail()
  const { createWallet } = useCreateWallet()

  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<string | null>(null)
  const setupFor = useRef<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  const apiResponse = useCallback(async (path: string, init?: ApiInit) => apiRaw(path, await getAccessToken(), init), [getAccessToken])
  const api = useCallback(async <T,>(path: string, init?: ApiInit) => apiJson<T>(path, await getAccessToken(), init), [getAccessToken])

  // After sign-in: make sure the user has a NEAR wallet, then register with our API.
  useEffect(() => {
    if (!ready || !authenticated || !user) return
    const key = `${user.id}:${attempt}`
    if (setupFor.current === key) return
    setupFor.current = key
    const run = async () => {
      try {
        if (!hasNearWallet(user.linkedAccounts)) await createWallet({ chainType: 'near' })
        const res = await api<{ me: Me }>('/api/me', { method: 'POST' })
        setMe(res.me)
        setError(null)
      } catch (err) {
        setError(errorMessage(err))
      }
    }
    void run()
  }, [ready, authenticated, user, attempt, api, createWallet])

  // While waiting for the treasurer, check every 15 seconds whether the pass was issued.
  const pending = authenticated && me?.status === 'pending' && !!me.name
  useEffect(() => {
    if (!pending) return
    const timer = setInterval(() => {
      api<{ me: Me | null }>('/api/me')
        .then((res) => res.me && setMe(res.me))
        .catch(() => {})
    }, 15_000)
    return () => clearInterval(timer)
  }, [pending, api])

  const current = authenticated ? me : null
  const status: SessionStatus = !ready
    ? 'loading'
    : !authenticated
      ? 'signed-out'
      : error
        ? 'error'
        : !current
          ? 'setting-up'
          : !current.name
            ? 'needs-name'
            : current.status === 'pending'
              ? 'pending'
              : 'active'

  const value: Session = {
    status,
    me: current,
    error,
    sendCode: (email) => privySendCode({ email }),
    verifyCode: async (code) => {
      await loginWithCode({ code })
    },
    saveName: async (name) => {
      const res = await api<{ me: Me }>('/api/me', { method: 'PATCH', json: { name } })
      setMe(res.me)
    },
    submitFeeProof: async (form) => {
      const res = await api<{ me: Me }>('/api/me/fee-proof', { form })
      setMe(res.me)
    },
    retry: () => {
      setError(null)
      setAttempt((a) => a + 1)
    },
    signOut: async () => {
      await logout()
      setMe(null)
      setError(null)
      setupFor.current = null
    },
    api,
    apiResponse,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession(): Session {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSession needs <SessionProvider> (only available after the page mounts)')
  return ctx
}

/** The session, or null before the page has mounted. */
export const useSessionOptional = () => useContext(Ctx)

/** Renders its children once the session exists (after the page mounts). */
export function SessionReady({ children }: { children: ReactNode }) {
  return useContext(Ctx) ? <>{children}</> : null
}
