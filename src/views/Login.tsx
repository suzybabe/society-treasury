'use client'

import { ArrowRight, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import useSWR from 'swr'
import { RETURN_KEY } from '../components/AppShell'
import { MembershipPass } from '../components/MembershipPass'
import { PendingMembership } from '../components/PendingMembership'
import { CountUp, EASE, int, Reveal, WordsUp } from '../components/motion'
import { HeroArt } from '../components/HeroArt'
import { SiteFooter } from '../components/SiteFooter'
import { StepIcon, type StepIconKind } from '../components/StepIcons'
import { ThemeToggle } from '../components/ThemeToggle'
import { Logo } from '../components/ui'
import { apiJson, errorMessage } from '../lib/api'
import { eur } from '../lib/format'
import type { Member } from '../lib/types'
import { useSession } from '../state/session'

interface PublicSummary {
  societyName: string
  shortName: string
  term: string
  membershipFee: number
  passes: number
  receipts: number
  balance: number
}

const STEPS: { title: string; text: string; icon: StepIconKind }[] = [
  { title: 'Sign up', text: 'Use your university email. A NEAR wallet is created for you automatically.', icon: 'signup' },
  { title: 'Pay the fee', text: 'Cash, card or bank transfer, like you do now. Then send your proof.', icon: 'pay' },
  { title: 'Get your pass', text: 'The treasurer confirms it and your membership pass is minted on NEAR.', icon: 'pass' },
  { title: 'Request', text: 'A committee member asks to spend money, with the amount and the reason.', icon: 'request' },
  { title: 'Vote', text: 'The committee votes on every request, and students vote too: their majority counts as one committee vote.', icon: 'vote' },
  { title: 'Check', text: 'Every vote, payment and receipt is visible to all members, for good.', icon: 'check' },
]

const SAMPLE_PASS: Member = { id: 'sample', name: 'Your name', email: '', role: 'student', near: 'your-account.near', passId: 0, joinedAt: '' }

function Step({ children, k }: { children: ReactNode; k: string }) {
  return (
    <motion.div key={k} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: EASE }}>
      {children}
    </motion.div>
  )
}

function FormError({ error }: { error: string | null }) {
  return error ? <p className="mt-2 text-sm text-brick">{error}</p> : null
}

/** Email → code → wallet setup → name → waiting for the treasurer → into the app. */
function SignIn() {
  const session = useSession()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session.status !== 'active') return
    // Back to the page they were on before signing in, if any.
    let target = '/home'
    try {
      const saved = sessionStorage.getItem(RETURN_KEY)
      sessionStorage.removeItem(RETURN_KEY)
      if (saved && saved.startsWith('/') && !saved.startsWith('/login')) target = saved
    } catch {
      /* storage unavailable */
    }
    router.replace(target)
  }, [session.status, router])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const onEmail = (e: FormEvent) => {
    e.preventDefault()
    const address = email.trim()
    void run(async () => {
      await session.sendCode(address)
      setCodeSentTo(address)
    })
  }
  const onCode = (e: FormEvent) => {
    e.preventDefault()
    void run(() => session.verifyCode(code.trim()))
  }
  const onName = (e: FormEvent) => {
    e.preventDefault()
    void run(() => session.saveName(name.trim()))
  }

  const { status } = session
  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === 'loading' || status === 'active' ? (
        <Step k="loading">
          <Working text="Loading…" />
        </Step>
      ) : status === 'signed-out' && !codeSentTo ? (
        <Step k="email">
          <label htmlFor="email" className="label mb-2 block">
            Sign in or sign up with your university email
          </label>
          <form onSubmit={onEmail} className="flex gap-2">
            <input id="email" className="input !h-12" type="email" required autoComplete="email" placeholder="you@uni.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button disabled={busy} className="btn btn-ink group h-12 shrink-0">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <>Continue <ArrowRight size={16} className="transition group-hover:translate-x-1" /></>}
            </button>
          </form>
          <FormError error={error} />
          <p className="mt-3 text-xs text-ink-3">We’ll email you a 6-digit code. New here? The same code creates your account.</p>
        </Step>
      ) : status === 'signed-out' ? (
        <Step k="code">
          <label htmlFor="code" className="label mb-2 block">
            Enter the code sent to {codeSentTo}
          </label>
          <form onSubmit={onCode} className="flex gap-2">
            <input
              id="code"
              className="input num !h-12 font-mono tracking-[0.4em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <button disabled={busy || code.length !== 6} className="btn btn-ink h-12 shrink-0">
              {busy ? <Loader2 size={16} className="animate-spin" /> : 'Verify'}
            </button>
          </form>
          <FormError error={error} />
          <button
            onClick={() => {
              setCodeSentTo(null)
              setCode('')
              setError(null)
            }}
            className="mt-3 text-xs text-ink-3 underline underline-offset-4 hover:text-ink"
          >
            Use a different email
          </button>
        </Step>
      ) : status === 'setting-up' ? (
        <Step k="setup">
          <Working text="Setting up your account and NEAR wallet…" />
        </Step>
      ) : status === 'error' ? (
        <Step k="error">
          <div className="box p-4 text-sm">
            <div className="font-medium text-brick">We couldn’t finish setting up your account.</div>
            <div className="mt-1 text-ink-2">{session.error}</div>
            <div className="mt-3 flex gap-2">
              <button onClick={session.retry} className="btn btn-ink btn-sm">
                Try again
              </button>
              <button onClick={() => void session.signOut()} className="btn btn-line btn-sm">
                Sign out
              </button>
            </div>
          </div>
        </Step>
      ) : status === 'needs-name' ? (
        <Step k="name">
          <label htmlFor="name" className="label mb-2 block">
            Your full name, as it should appear on your pass
          </label>
          <form onSubmit={onName} className="flex gap-2">
            <input id="name" className="input !h-12" required minLength={2} maxLength={80} autoComplete="name" autoFocus placeholder="Ada Lovelace" value={name} onChange={(e) => setName(e.target.value)} />
            <button disabled={busy || name.trim().length < 2} className="btn btn-ink h-12 shrink-0">
              {busy ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
            </button>
          </form>
          <FormError error={error} />
        </Step>
      ) : (
        <Step k="pending">
          <PendingMembership />
        </Step>
      )}
    </AnimatePresence>
  )
}

function Working({ text }: { text: string }) {
  return (
    <div className="flex h-12 items-center gap-3 text-sm text-ink-2">
      <Loader2 size={16} className="animate-spin text-accent" /> {text}
    </div>
  )
}

export default function Login() {
  const { data } = useSWR<PublicSummary>('/api/public', (path: string) => apiJson<PublicSummary>(path, null))
  const shortName = data?.shortName ?? 'Society'

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Logo short={shortName} />
        <ThemeToggle />
      </div>

      <main className="flex-1">
        {/* Hero: headline and sign-in, with the animated pass */}
        <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-5 pb-14 pt-4 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-20 lg:pt-10">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="inline-flex min-h-7 items-center gap-2 rounded-full border border-ink/15 px-3 py-1 font-mono text-[11px] uppercase tracking-wide text-ink-2"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
                <span className="relative h-2 w-2 rounded-full bg-accent" />
              </span>
              {data ? `${data.societyName} · ${data.term}` : 'Society treasury'}
            </motion.div>
            <h1 className="wide mt-5 text-[3rem] font-black leading-[0.9] tracking-tight sm:text-7xl lg:text-[5.4rem]">
              <WordsUp text="Society money," />
              <br />
              <WordsUp text="in the" delay={0.2} />
              <span className="relative inline-block">
                <WordsUp text="open." className="text-accent" delay={0.32} />
                <svg viewBox="0 0 200 20" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-3 w-full text-accent" aria-hidden="true">
                  <motion.path d="M3 14 C 60 4, 140 4, 197 12" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.9, duration: 0.8, ease: EASE }} />
                </svg>
              </span>
            </h1>
            <Reveal onLoad delay={0.45}>
              <p className="mt-6 max-w-md text-lg text-ink-2">
                Membership passes, committee votes and every euro spent, visible to every member and impossible to quietly change.
              </p>
            </Reveal>
            <Reveal onLoad delay={0.55} className="mt-8 max-w-lg">
              <div className="rounded-xl border-2 border-ink bg-card p-5 shadow-[6px_6px_0_0_var(--color-accent)] sm:p-6">
                <SignIn />
              </div>
            </Reveal>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}>
            <HeroArt>
              <motion.div initial={{ y: -40, rotate: -16, opacity: 0 }} animate={{ y: 0, rotate: -6, opacity: 1 }} transition={{ type: 'spring', stiffness: 70, damping: 13, delay: 0.35 }}>
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}>
                  <MembershipPass member={SAMPLE_PASS} term={data?.term ?? ''} shortName={shortName} />
                </motion.div>
              </motion.div>
            </HeroArt>
          </motion.div>
        </section>

        {/* How it works, straight after the hero */}
        <section className="border-y-2 border-ink bg-stage/60">
          <div className="mx-auto w-full max-w-6xl px-5 py-14 lg:py-20">
            <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="wide text-4xl font-black tracking-tight sm:text-5xl">How it works</h2>
              <p className="max-w-sm text-ink-2">From paying your fee to seeing every receipt, in six steps. No crypto knowledge needed.</p>
            </Reveal>
            <ol className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((s, i) => (
                <motion.li
                  key={s.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.55, ease: EASE, delay: (i % 3) * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="group relative overflow-hidden rounded-xl border-2 border-ink bg-card p-6 transition-shadow hover:shadow-[6px_6px_0_0_var(--color-accent)]"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-ink">
                      <StepIcon kind={s.icon} />
                    </span>
                    <span className="num font-dot text-5xl font-black leading-none text-accent/80">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="wide mt-6 text-xl font-bold">{s.title}</div>
                  <p className="mt-1.5 text-sm text-ink-2">{s.text}</p>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* Live numbers */}
        {data && (
          <section className="bg-ink text-paper">
            <div className="mx-auto grid w-full max-w-6xl grid-cols-1 divide-y divide-paper/15 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {[
                ['In the treasury', <CountUp key="b" value={data.balance} format={eur} />],
                ['Passes issued', <CountUp key="p" value={data.passes} format={int} />],
                ['Receipts on file', <CountUp key="r" value={data.receipts} format={int} />],
              ].map(([k, v], i) => (
                <div key={i} className="py-8 sm:px-8 sm:first:pl-0">
                  <div className="font-mono text-[11px] uppercase tracking-wide text-paper/60">{k}</div>
                  <div className="num mt-2 font-dot text-5xl font-black">{v}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter societyName={data?.societyName} />
    </div>
  )
}
