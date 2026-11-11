'use client'

import { ArrowRight, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import useSWR from 'swr'
import { MembershipPass } from '../components/MembershipPass'
import { PendingMembership } from '../components/PendingMembership'
import { CountUp, EASE, int, Reveal, WordsUp } from '../components/motion'
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

const STEPS = [
  ['Sign up', 'Use your university email. A NEAR wallet is created for you.'],
  ['Pay the fee', 'Cash, card or bank transfer, like you do now.'],
  ['Get your pass', 'The treasurer confirms it and issues your membership pass.'],
  ['Request', 'A committee member asks to spend money.'],
  ['Vote', 'The committee votes. Small amounts are approved automatically.'],
  ['Check', 'Every vote, payment and receipt is visible to all members.'],
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
    if (session.status === 'active') router.replace('/home')
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
    <div className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Logo short={shortName} />
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-[11px] text-ink-3 sm:inline">Track: Social Money · Built on NEAR</span>
          <ThemeToggle />
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-12 px-5 pb-16 pt-1 sm:pt-4 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        {/* Product shot (below the sign-in form on mobile) */}
        <div className="order-2 lg:order-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="relative grid aspect-[4/3.3] place-items-center overflow-hidden rounded-md bg-stage"
          >
            <motion.div
              className="w-[74%]"
              initial={{ y: -60, rotate: -14, opacity: 0 }}
              animate={{ y: 0, rotate: -5, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 70, damping: 13, delay: 0.25 }}
            >
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}>
                <MembershipPass member={SAMPLE_PASS} term={data?.term ?? ''} shortName={shortName} />
              </motion.div>
            </motion.div>
            <div className="absolute bottom-4 left-4 font-mono text-[11px] text-ink-3">Fig. 1 · Membership pass with a NEAR wallet</div>
            {data && <div className="absolute right-4 top-4 rounded-full bg-paper px-3 py-1 font-mono text-[11px]">{eur(data.membershipFee)} / term</div>}
          </motion.div>

          {data && (
            <div className="mt-6 grid grid-cols-3 border-y border-ink/12">
              {[
                ['In the treasury', <CountUp key="b" value={data.balance} format={eur} />],
                ['Passes issued', <CountUp key="p" value={data.passes} format={int} />],
                ['Receipts on file', <CountUp key="r" value={data.receipts} format={int} />],
              ].map(([k, v], i) => (
                <div key={i} className={`py-4 ${i ? 'border-l border-ink/12 pl-4' : ''}`}>
                  <div className="label">{k}</div>
                  <div className="num mt-1.5 font-dot text-2xl font-extrabold sm:text-3xl">{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sign in */}
        <div className="order-1 lg:order-2 lg:pt-2">
          <div className="label min-h-4">{data && `${data.societyName} · ${data.term}`}</div>
          <h1 className="wide mt-3 text-[2.5rem] font-extrabold leading-[0.95] tracking-tight sm:text-6xl">
            <WordsUp text="The society treasury," />
            <br />
            <WordsUp text="in the open." className="text-ink-3" delay={0.25} />
          </h1>
          <Reveal onLoad delay={0.4}>
            <p className="mt-4 max-w-md text-ink-2 sm:mt-5 sm:text-lg">
              Membership passes, committee votes and spending records, visible to every member and impossible to quietly change.
            </p>
          </Reveal>
          <Reveal onLoad delay={0.5} className="mt-6 min-h-40 sm:mt-8">
            <SignIn />
          </Reveal>
        </div>

        {/* How it works */}
        <Reveal className="order-3 lg:col-span-2">
          <div className="border-b border-ink pb-2">
            <h2 className="semi-wide text-[17px] font-semibold">How it works</h2>
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(([k, d], i) => (
              <motion.li
                key={k}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.06 }}
                className="flex gap-4 border-b border-ink/12 py-5 pr-6"
              >
                <span className="font-dot text-3xl font-black leading-none text-accent">{i + 1}</span>
                <div>
                  <div className="font-semibold">{k}</div>
                  <div className="mt-0.5 text-sm text-ink-3">{d}</div>
                </div>
              </motion.li>
            ))}
          </ol>
        </Reveal>
      </main>
    </div>
  )
}

