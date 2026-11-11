'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { MotionConfig } from 'motion/react'
import { useSyncExternalStore, type ReactNode } from 'react'
import { SessionProvider } from '../state/session'
import { StoreReady, TreasuryProvider } from '../state/store'
import { Toaster } from './AppShell'

// The Privy app ID is public (it ships in the page), so it has a default and
// the app runs without a .env.local.
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmkzerpay007mld0chxqzp9sc'
const PRIVY_CLIENT_ID = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || undefined
const subscribeNoop = () => () => {}

/**
 * Auth and data only exist in the browser. Before the page mounts (and on the
 * server) children still render, so Next.js can prerender every route, but
 * anything that needs the session or data waits for <StoreReady> or the
 * session to appear.
 */
export function Providers({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false)

  if (!PRIVY_APP_ID) return <MissingConfig />
  if (!mounted) return <>{children}</>

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      clientId={PRIVY_CLIENT_ID}
      config={{
        loginMethods: ['email'],
        appearance: { accentColor: '#2b50ff' },
        // Only a NEAR wallet is created (in SessionProvider), not EVM or Solana ones.
        embeddedWallets: { ethereum: { createOnLogin: 'off' }, solana: { createOnLogin: 'off' } },
      }}
    >
      <SessionProvider>
        <TreasuryProvider>
          <MotionConfig reducedMotion="user">
            {children}
            <StoreReady>
              <Toaster />
            </StoreReady>
          </MotionConfig>
        </TreasuryProvider>
      </SessionProvider>
    </PrivyProvider>
  )
}

function MissingConfig() {
  return (
    <div className="mx-auto max-w-lg px-5 py-20">
      <div className="label">Setup needed</div>
      <h1 className="wide mt-2 text-3xl font-bold">Add your Privy keys</h1>
      <p className="mt-3 text-ink-2">
        Copy <code className="font-mono text-sm">.env.example</code> to <code className="font-mono text-sm">.env.local</code>, fill in{' '}
        <code className="font-mono text-sm">NEXT_PUBLIC_PRIVY_APP_ID</code>, <code className="font-mono text-sm">PRIVY_APP_SECRET</code> and{' '}
        <code className="font-mono text-sm">DATABASE_URL</code>, then restart the dev server.
      </p>
    </div>
  )
}
