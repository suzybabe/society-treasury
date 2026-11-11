'use client'

import { House, LogOut, ScrollText, SlidersHorizontal, Users, Vote, X, type LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Suspense, useEffect, type ReactNode } from 'react'
import { shortHash } from '../lib/chain'
import type { ActivityKind, Role } from '../lib/types'
import { useSessionOptional } from '../state/session'
import { useTreasury, useTreasuryOptional } from '../state/store'
import { ThemeToggle } from './ThemeToggle'
import { Avatar, Logo, RoleBadge } from './ui'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  roles?: Role[]
  /** A count to show next to the item, e.g. members waiting for approval. */
  badge?: number
}

const NAV: NavItem[] = [
  { href: '/home', label: 'Home', icon: House },
  { href: '/spending', label: 'Spending', icon: ScrollText },
  { href: '/members', label: 'Members', icon: Users },
  { href: '/committee', label: 'Committee', icon: Vote, roles: ['president', 'treasurer', 'committee'] },
  { href: '/settings', label: 'Settings', icon: SlidersHorizontal, roles: ['president'] },
]

export const KIND_TAG: Record<ActivityKind, string> = {
  vote: 'Vote',
  request: 'Request',
  pass: 'Pass issued',
  spent: 'Receipt',
  checkin: 'Check-in',
  settings: 'Governance',
  decision: 'Decision',
}

export function Ticker() {
  const { activity } = useTreasury()
  if (activity.length === 0) return <div className="h-8 bg-ink" />
  const row = (
    <div className="flex shrink-0 items-center">
      {activity.slice(0, 10).map((a) => (
        <span key={a.id} className="flex items-center gap-2.5 px-6">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="text-paper/50">{KIND_TAG[a.kind]}</span>
          <span>{a.text}</span>
          {a.tx && <span className="text-paper/40">{shortHash(a.tx)}</span>}
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

const PILL_SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const

const isActiveHref = (active: string | null, href: string) => !!active && (active === href || active.startsWith(`${href}/`))

/** Sidebar links on desktop, a bottom tab bar on phones. */
function NavLinks({ items, variant, active }: { items: NavItem[]; variant: 'side' | 'bottom'; active: string | null }) {
  if (variant === 'side') {
    return (
      <nav className="flex flex-col gap-1">
        {items.map((n) => {
          const on = isActiveHref(active, n.href)
          const Icon = n.icon
          return (
            <Link key={n.href} href={n.href} className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium">
              {on && <motion.span layoutId="nav-pill-side" className="absolute inset-0 rounded-lg bg-ink" transition={PILL_SPRING} />}
              <Icon size={18} className={`relative shrink-0 transition-colors ${on ? 'text-paper' : 'text-ink-3 group-hover:text-ink'}`} />
              <span className={`relative flex-1 transition-colors ${on ? 'text-paper' : 'text-ink-2 group-hover:text-ink'}`}>{n.label}</span>
              {!!n.badge && (
                <span className={`relative grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[10.5px] font-medium ${on ? 'bg-accent text-on-accent' : 'bg-sun text-ink'}`}>
                  {n.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    )
  }
  return (
    <nav className="flex items-stretch justify-around px-1">
      {items.map((n) => {
        const on = isActiveHref(active, n.href)
        const Icon = n.icon
        return (
          <Link key={n.href} href={n.href} className="relative flex flex-1 flex-col items-center gap-1 py-2 text-[10.5px] font-medium">
            {on && <motion.span layoutId="nav-pill-bottom" className="absolute inset-x-1.5 inset-y-1 rounded-lg bg-ink" transition={PILL_SPRING} />}
            <span className="relative">
              <Icon size={19} className={on ? 'text-paper' : 'text-ink-3'} />
              {!!n.badge && <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-sun px-1 font-mono text-[9px] text-ink">{n.badge}</span>}
            </span>
            <span className={`relative ${on ? 'text-paper' : 'text-ink-2'}`}>{n.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

/** usePathname can suspend while Next.js prerenders dynamic routes, so it lives in its own leaf. */
function ActiveNav(props: { items: NavItem[]; variant: 'side' | 'bottom' }) {
  return <NavLinks {...props} active={usePathname()} />
}

function Nav(props: { items: NavItem[]; variant: 'side' | 'bottom' }) {
  return (
    <Suspense fallback={<NavLinks {...props} active={null} />}>
      <ActiveNav {...props} />
    </Suspense>
  )
}

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex items-center gap-3 font-mono text-xs text-ink-3">
        <span className="h-2 w-2 animate-ping rounded-full bg-accent" /> Loading your treasury…
      </div>
    </div>
  )
}

/**
 * Header, footer and sign-in guard for every member page. Anyone who isn't an
 * active member (signed out, or still finishing sign-up) is sent to /login,
 * which shows the right next step.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const session = useSessionOptional()
  const store = useTreasuryOptional()
  const router = useRouter()
  const status = session?.status
  const mustLeave = !!status && status !== 'loading' && status !== 'active'

  useEffect(() => {
    if (mustLeave) router.replace('/login')
  }, [mustLeave, router])

  // Before mount there's no session yet. Still render the page segment (its
  // <StoreReady> shows nothing) so Next.js can prerender and validate it.
  if (!session) return <>{children}</>
  if (!store) return <Loading />
  return <SignedInShell>{children}</SignedInShell>
}

function SignedInShell({ children }: { children: ReactNode }) {
  const { me, settings, payments, logout } = useTreasury()
  const router = useRouter()
  const waiting = me.role === 'treasurer' || me.role === 'president' ? payments.length : 0
  const items = NAV.filter((n) => !n.roles || n.roles.includes(me.role)).map((n) => (n.href === '/members' ? { ...n, badge: waiting } : n))
  const signOut = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink/12 bg-paper lg:flex">
        <div className="px-5 pb-5 pt-6">
          <Link href="/home">
            <Logo short={settings.shortName} />
          </Link>
        </div>
        <div className="mx-4 rounded-md border border-ink/12 px-3 py-2.5">
          <div className="label">Society</div>
          <div className="mt-0.5 truncate text-sm font-medium">{settings.societyName}</div>
          <div className="font-mono text-[11px] text-ink-3">Term {settings.term}</div>
        </div>
        <div className="mt-6 flex-1 overflow-y-auto px-3">
          <Nav items={items} variant="side" />
        </div>
        <div className="border-t border-ink/12 p-3">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <Avatar name={me.name} size={34} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium leading-tight">{me.name}</div>
              <RoleBadge role={me.role} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 px-2">
            <ThemeToggle />
            <button onClick={signOut} className="btn btn-line btn-sm flex-1">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <Ticker />
        {/* Top bar (phones and tablets) */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink/12 bg-paper/85 px-4 backdrop-blur-md lg:hidden">
          <Link href="/home">
            <Logo short={settings.shortName} />
          </Link>
          <div className="flex items-center gap-2">
            <Avatar name={me.name} size={30} />
            <ThemeToggle />
            <button onClick={signOut} title="Sign out" aria-label="Sign out" className="grid h-9 w-9 place-items-center rounded-full text-ink-3 transition hover:bg-ink hover:text-paper">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:py-14 lg:px-10">{children}</main>

        <footer className="border-t border-ink/12">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-6 pb-24 font-mono text-[11px] text-ink-3 sm:flex-row sm:justify-between lg:px-10 lg:pb-6">
            <span>
              {settings.societyName} · Term {settings.term}
            </span>
            <span>Past records can’t be edited or deleted.</span>
          </div>
        </footer>
      </div>

      {/* Bottom tabs (phones and tablets) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/12 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <Nav items={items} variant="bottom" />
      </div>
    </div>
  )
}

export function Toaster() {
  const { toasts, dismissToast } = useTreasury()
  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-50 lg:bottom-4 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
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
            <div className="min-w-0 flex-1 text-sm">{t.text}</div>
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
