'use client'

import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ticker } from '../components/AppShell'
import { ThemeToggle } from '../components/ThemeToggle'
import { MembershipPass } from '../components/MembershipPass'
import { CountUp, EASE, int, Reveal, WordsUp } from '../components/motion'
import { Logo, RoleBadge } from '../components/ui'
import { DEMO_ACCOUNTS } from '../lib/mock'
import { eur } from '../lib/format'
import { useTreasury } from '../state/store'

const STEPS = [
  ['Pay the fee', 'Cash, card or bank transfer, like you do now.'],
  ['Get your pass', 'The treasurer confirms it and mints your membership NFT.'],
  ['Request', 'A committee member asks to spend money.'],
  ['Vote', 'The committee votes. Under €20 is approved automatically.'],
  ['Spend', 'The treasurer pays, uploads the receipt and marks it Spent.'],
  ['Check', 'Every vote, payment and receipt is on NEAR for all members.'],
]

export default function Login() {
  const { me, members, settings, totals, requests, login } = useTreasury()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)

  useEffect(() => {
    if (me) router.replace('/home')
  }, [me, router])

  const go = (id: string) => {
    login(id)
    router.replace('/home')
  }
  const onEmail = (e: React.FormEvent) => {
    e.preventDefault()
    const found = members.find((m) => m.email.toLowerCase() === email.trim().toLowerCase())
    if (found) go(found.id)
    else setSentTo(email.trim())
  }

  const preview = members.find((m) => m.id === 'm6')!
  const demo = DEMO_ACCOUNTS.map((id) => members.find((m) => m.id === id)!).filter(Boolean)
  const receipts = requests.filter((r) => r.status === 'spent').length

  return (
    <div className="flex min-h-screen flex-col">
      <Ticker />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Logo short={settings.shortName} />
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
                <MembershipPass member={preview} term={settings.term} shortName={settings.shortName} />
              </motion.div>
            </motion.div>
            <div className="absolute bottom-4 left-4 font-mono text-[11px] text-ink-3">Fig. 1 · Membership pass, minted on NEAR</div>
            <div className="absolute right-4 top-4 rounded-full bg-paper px-3 py-1 font-mono text-[11px]">{eur(settings.membershipFee)} / term</div>
          </motion.div>

          <div className="mt-6 grid grid-cols-3 border-y border-ink/12">
            {[
              ['In the treasury', <CountUp key="b" value={totals.balance} format={eur} />],
              ['Passes issued', <CountUp key="p" value={totals.passes} format={int} />],
              ['Receipts on file', <CountUp key="r" value={receipts} format={int} />],
            ].map(([k, v], i) => (
              <div key={i} className={`py-4 ${i ? 'border-l border-ink/12 pl-4' : ''}`}>
                <div className="label">{k}</div>
                <div className="num mt-1.5 font-dot text-2xl font-extrabold sm:text-3xl">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Product info */}
        <div className="order-1 lg:order-2 lg:pt-2">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="label">
            {settings.societyName} · {settings.term}
          </motion.div>
          <h1 className="wide mt-3 text-[2.5rem] font-extrabold leading-[0.95] tracking-tight sm:text-6xl">
            <WordsUp text="The society treasury," />
            <br />
            <WordsUp text="in the open." className="text-ink-3" delay={0.25} />
          </h1>
          <Reveal onLoad delay={0.4}>
            <p className="mt-4 max-w-md text-ink-2 sm:mt-5 sm:text-lg">
              Membership passes, committee votes and spending records. They’re stored on NEAR, so every member can check them and nobody can quietly change them.
            </p>
          </Reveal>

          <Reveal onLoad delay={0.5} className="mt-6 sm:mt-8">
            <label htmlFor="email" className="label mb-2 block">
              Sign in with your university email
            </label>
            {sentTo ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="box p-4 text-sm">
                Sign-in link sent to <span className="font-medium">{sentTo}</span>.
                <button onClick={() => go('m6')} className="mt-2 flex items-center gap-1 font-medium underline underline-offset-4">
                  Open it (demo) <ArrowRight size={14} />
                </button>
              </motion.div>
            ) : (
              <form onSubmit={onEmail} className="flex gap-2">
                <input id="email" className="input !h-12" type="email" required autoComplete="email" placeholder="you@uni.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button className="btn btn-ink group h-12 shrink-0">
                  Continue <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </button>
              </form>
            )}
          </Reveal>

          <Reveal onLoad delay={0.6} className="mt-10">
            <div className="label mb-1">Try a demo account</div>
            {demo.map((m) => (
              <button
                key={m.id}
                onClick={() => go(m.id)}
                className="group flex w-full items-center justify-between border-b border-ink/12 py-3 text-left transition-[padding] duration-300 hover:pl-2"
              >
                <span className="font-medium">{m.name}</span>
                <span className="flex items-center gap-4">
                  <RoleBadge role={m.role} />
                  <ArrowUpRight size={16} className="text-ink-3 transition duration-300 group-hover:rotate-45 group-hover:text-accent" />
                </span>
              </button>
            ))}
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
