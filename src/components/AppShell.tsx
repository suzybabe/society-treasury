'use client'

import { LogOut, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense, useEffect, type ReactNode } from 'react'
import { shortHash } from '../lib/chain'
import { timeAgo } from '../lib/format'
import { DEMO_ACCOUNTS } from '../lib/mock'
import type { ActivityKind, Role } from '../lib/types'
import { useTreasury, useTreasuryOptional } from '../state/store'
import { EASE } from './motion'
import { ThemeToggle } from './ThemeToggle'
import { Avatar, Logo, RoleBadge } from './ui'

interface NavItem {
  href: string
  label: string
  roles?: Role[]
}

const NAV: NavItem[] = [
  { href: '/home', label: 'Home' },
  { href: '/spending', label: 'Spending' },
  { href: '/committee', label: 'Committee', roles: ['president', 'treasurer', 'committee'] },
  { href: '/settings', label: 'Settings', roles: ['president'] },
]

export const KIND_TAG: Record<ActivityKind, string> = {
  vote: 'Vote',
  request: 'Request',
  pass: 'Pass minted',
  spent: 'Receipt',
  checkin: 'Check-in',
  settings: 'Governance',
  decision: 'Decision',
}

export function Ticker() {
  const { activity } = useTreasury()
  const row = (
    <div className="flex shrink-0 items-center">
      {activity.slice(0, 10).map((a) => (
        <span key={a.id} className="flex items-center gap-2.5 px-6">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-paper/50">{KIND_TAG[a.kind]}</span>
          <span>{a.text}</span>
          <span className="text-paper/40">{shortHash(a.tx)}</span>
        </span>
      ))}
    </div>
  )
  return (
    <div className="group h-8 overflow-hidden bg-ink font-mono text-[11px] text-paper">
      <div className="flex h-full w-max items-center animate-[marquee_70s_linear_infinite] group-hover:[animation-play-state:paused]">
        {row}
        {row}
      </div>
    </div>
  )
}

function NavLinks({ items, id, active }: { items: NavItem[]; id: string; active: string | null }) {
  return (
    <nav className="flex items-center gap-1">
      {items.map((n) => {
        const isActive = !!active && (active === n.href || active.startsWith(`${n.href}/`))
        return (
          <Link key={n.href} href={n.href} className="relative rounded-full px-3.5 py-1.5 text-sm font-medium">
            {isActive && <motion.span layoutId={`nav-pill-${id}`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className={`relative transition-colors ${isActive ? 'text-paper' : 'text-ink-2 hover:text-ink'}`}>{n.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

/** usePathname can suspend while Next.js prerenders dynamic routes, so it lives in its own leaf. */
function ActiveNav(props: { items: NavItem[]; id: string }) {
  return <NavLinks {...props} active={usePathname()} />
}

function Nav(props: { items: NavItem[]; id: string }) {
  return (
    <Suspense fallback={<NavLinks {...props} active={null} />}>
      <ActiveNav {...props} />
    </Suspense>
  )
}

function DemoSwitcher() {
  const { me, members, login } = useTreasury()
  const router = useRouter()
  const options = members.filter((m) => DEMO_ACCOUNTS.includes(m.id) || m.role !== 'student' || m.id === me?.id)
  return (
    <motion.label
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.6, ease: EASE }}
      className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-ink py-1 pl-3.5 pr-1 text-paper shadow-lg"
    >
      <span className="font-mono text-[10.5px] uppercase tracking-wide text-paper/60">Demo · view as</span>
      <select
        className="h-7 cursor-pointer appearance-none rounded-full bg-paper/10 px-3 text-xs font-medium text-paper outline-none hover:bg-paper/20"
        value={me?.id}
        onChange={(e) => {
          login(e.target.value)
          router.push('/home')
        }}
      >
        {options.map((m) => (
          <option key={m.id} value={m.id} className="bg-paper text-ink">
            {m.name} · {m.role}
          </option>
        ))}
      </select>
    </motion.label>
  )
}

/** Header, footer and auth guard shared by every signed-in page. */
export function AppShell({ children }: { children: ReactNode }) {
  // Before mount there's no store yet. Still render the page segment (its
  // <StoreReady> shows nothing) so Next.js can prerender and validate it.
  if (!useTreasuryOptional()) return <>{children}</>
  return <SignedInShell>{children}</SignedInShell>
}

function SignedInShell({ children }: { children: ReactNode }) {
  const { me, settings, logout } = useTreasury()
  const router = useRouter()

  useEffect(() => {
    if (!me) router.replace('/login')
  }, [me, router])

  if (!me) return null
  const items = NAV.filter((n) => !n.roles || n.roles.includes(me.role))
  const signOut = () => {
    logout()
    router.replace('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Ticker />
      <header className="sticky top-0 z-30 border-b border-ink/12 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
          <div className="flex items-center gap-8">
            <Link href="/home">
              <Logo short={settings.shortName} />
            </Link>
            <div className="hidden md:block">
              <Nav items={items} id="desk" />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium leading-tight">{me.name}</div>
              <RoleBadge role={me.role} />
            </div>
            <Avatar name={me.name} size={34} />
            <ThemeToggle />
            <button onClick={signOut} title="Sign out" className="grid h-9 w-9 place-items-center rounded-full text-ink-3 transition hover:bg-ink hover:text-paper">
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <div className="-mt-1 overflow-x-auto px-4 pb-2 md:hidden">
          <Nav items={items} id="mob" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:py-14">{children}</main>

      <footer className="border-t border-ink/12">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-6 pb-20 font-mono text-[11px] text-ink-3 sm:flex-row sm:justify-between">
          <span>
            {settings.societyName} · Term {settings.term}
          </span>
          <span>Records are stored on NEAR testnet and can’t be edited.</span>
        </div>
      </footer>

      <DemoSwitcher />
    </div>
  )
}

export function Toaster() {
  const { toasts, dismissToast } = useTreasury()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-md bg-ink p-3.5 text-paper shadow-xl"
          >
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.tone === 'warn' ? 'bg-brick' : t.tone === 'info' ? 'bg-cobalt' : 'bg-accent'}`} />
            <div className="min-w-0 flex-1">
              <div className="text-sm">{t.text}</div>
              {t.tx && (
                <div className="mt-1 font-mono text-[10.5px] text-paper/50">
                  tx {shortHash(t.tx)} · {timeAgo(new Date().toISOString())}
                </div>
              )}
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-paper/40 hover:text-paper">
              <X size={14} />
            </button>
            <motion.span className="absolute bottom-0 left-0 h-[2px] bg-accent" initial={{ width: '100%' }} animate={{ width: 0 }} transition={{ duration: 4.2, ease: 'linear' }} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
