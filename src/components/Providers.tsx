'use client'

import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'
import { StoreReady, TreasuryProvider } from '../state/store'
import { Toaster } from './AppShell'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TreasuryProvider>
      <MotionConfig reducedMotion="user">
        {children}
        <StoreReady>
          <Toaster />
        </StoreReady>
      </MotionConfig>
    </TreasuryProvider>
  )
}
