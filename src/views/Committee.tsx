'use client'

import { Banknote, Check, CreditCard, Landmark, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CountUp, EASE, int, Reveal } from '../components/motion'
import { LedgerHead, RequestRow } from '../components/RequestRow'
import { Empty, Figure, PageHeader, Section, VoteMeter } from '../components/ui'
import { eur, timeAgo } from '../lib/format'
import { isCommittee, requiredYes, tally, voteBlock } from '../lib/rules'
import type { Category } from '../lib/types'
import { memberById, useMe, useTreasury } from '../state/store'

const CATEGORIES: Category[] = ['Events', 'Equipment', 'Food', 'Travel', 'Software', 'Other']
const METHOD_ICON = { cash: Banknote, card: CreditCard, bank: Landmark }

const rowMotion = {
  layout: true,
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: 60, transition: { duration: 0.3, ease: EASE } },
  transition: { duration: 0.4, ease: EASE },
} as const

function NewRequestForm() {
  const me = useMe()
  const { members, settings, submitRequest } = useTreasury()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>('Events')
  const [description, setDescription] = useState('')

  const n = Number(amount)
  const valid = title.trim().length > 2 && n > 0
  const eligible = members.filter((m) => isCommittee(m.role) && m.id !== me.id).length
  const need = requiredYes(eligible, settings.approvalPercent)
  const auto = n > 0 && n < settings.autoApproveLimit

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const id = submitRequest({ title: title.trim(), description: description.trim(), category, amount: Math.round(n * 100) / 100 })
    if (id) router.push(`/spending/${id}`)
  }

  return (
    <form id="new" onSubmit={submit} className="flex scroll-mt-28 flex-col gap-4">
      <label className="block">
        <span className="label mb-1.5 block">What’s it for?</span>
        <input className="input" placeholder="Snacks for the CTF night" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label mb-1.5 block">Amount (€)</span>
          <input className="input font-mono" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="block">
          <span className="label mb-1.5 block">Category</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="label mb-1.5 block">Details</span>
        <textarea className="input" rows={3} placeholder="Supplier, quote, why it’s needed" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={auto ? 'auto' : 'vote'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className={`rounded-md p-3 text-sm ${auto ? 'bg-leaf/12 text-ink' : 'bg-ink/[0.05] text-ink-2'}`}
        >
          {auto ? (
            <>
              <span className="font-semibold text-leaf">Auto-approved.</span> It’s under {eur(settings.autoApproveLimit)}, so it goes straight to the treasurer.
            </>
          ) : (
            <>
              Goes to a committee vote and needs <span className="font-semibold text-ink">{need} of {eligible}</span> yes votes. You can’t vote on your own request.
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <button disabled={!valid} className="btn btn-ink">
        Submit request
      </button>
    </form>
  )
}

export default function Committee() {
  const me = useMe()
  const { requests, members, settings, payments, castVote, confirmFee } = useTreasury()

  useEffect(() => {
    if (window.location.hash === '#new') setTimeout(() => document.getElementById('new')?.scrollIntoView({ behavior: 'smooth' }), 400)
  }, [])

  if (!isCommittee(me.role)) {
    return (
      <div>
        <Empty title="Committee only" sub="Students can see every request, vote and receipt in the spending log, but can’t make requests or vote." />
        <Link href="/spending" className="btn btn-line btn-sm">
          Open the spending log
        </Link>
      </div>
    )
  }

  const toVote = requests.filter((r) => voteBlock(r, me) === null)
  const mine = requests.filter((r) => r.requesterId === me.id)
  const toPay = requests.filter((r) => r.status === 'approved' || r.status === 'auto')
  const isTreasurer = me.role === 'treasurer'

  return (
    <>
      <PageHeader
        eyebrow="Committee"
        title="Committee dashboard"
        sub={`${members.filter((m) => isCommittee(m.role)).length} members. Anything over ${eur(settings.autoApproveLimit)} needs more than ${settings.approvalPercent}% of eligible votes.`}
      />

      <Reveal>
        <div className="grid grid-cols-2 border-b border-ink/12 lg:grid-cols-4">
          <Figure label="Needs your vote" value={<CountUp value={toVote.length} format={int} />} />
          <div className="border-l border-ink/12 pl-5">
            <Figure label="Your requests" value={<CountUp value={mine.length} format={int} />} />
          </div>
          <div className="border-t border-ink/12 lg:border-l lg:border-t-0 lg:pl-5">
            <Figure label="Ready to pay" value={<CountUp value={toPay.length} format={int} />} hint={eur(toPay.reduce((s, r) => s + r.amount, 0))} />
          </div>
          <div className="border-l border-t border-ink/12 pl-5 lg:border-t-0">
            <Figure label="Fees to confirm" value={<CountUp value={payments.length} format={int} />} />
          </div>
        </div>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 items-start gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col gap-14">
          <Reveal>
            <Section title="Waiting for your vote" right={<span className="font-mono text-xs text-ink-3">{toVote.length} open</span>}>
              {toVote.length === 0 && <Empty title="Nothing to vote on" sub="You’ve voted on every open request." />}
              <AnimatePresence initial={false}>
                {toVote.map((r) => {
                  const t = tally(r, members, settings)
                  const who = memberById(members, r.requesterId)
                  return (
                    <motion.div key={r.id} {...rowMotion} className="border-b border-ink/12 py-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-xs text-ink-3">
                            <span className="font-mono">{r.id}</span> · {who?.name} · {timeAgo(r.createdAt)}
                          </div>
                          <Link href={`/spending/${r.id}`} className="mt-0.5 block truncate text-lg font-semibold hover:underline hover:underline-offset-4">
                            {r.title}
                          </Link>
                        </div>
                        <div className="num shrink-0 font-dot text-2xl font-black">{eur(r.amount)}</div>
                      </div>
                      {r.description && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{r.description}</p>}
                      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex-1">
                          <VoteMeter yes={t.yes} no={t.no} eligible={t.eligible.length} need={t.need} />
                          <div className="mt-1.5 text-xs text-ink-3">
                            {t.yes} of {t.need} yes votes · {t.remaining} still to vote
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <motion.button whileTap={{ scale: 0.92 }} onClick={() => castVote(r.id, 'no')} className="btn btn-danger btn-sm flex-1">
                            <X size={14} /> No
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.92 }} onClick={() => castVote(r.id, 'yes')} className="btn btn-ink btn-sm flex-1">
                            <Check size={14} /> Yes
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </Section>
          </Reveal>

          {isTreasurer && (
            <Reveal>
              <Section title="Fee payments to confirm" right={<span className="font-mono text-xs text-ink-3">{payments.length} pending</span>}>
                {payments.length === 0 && <Empty title="No pending payments" sub="New sign-ups appear here after a student pays." />}
                <AnimatePresence initial={false}>
                  {payments.map((p) => {
                    const Icon = METHOD_ICON[p.method]
                    return (
                      <motion.div key={p.id} {...rowMotion} className="flex items-center gap-3 border-b border-ink/12 py-3">
                        <Icon size={18} className="shrink-0 text-ink-3" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-ink-3">
                            {p.method === 'bank' ? 'Bank transfer' : p.method === 'card' ? 'Card' : 'Cash'} · {eur(p.amount)} · {timeAgo(p.submittedAt)}
                          </div>
                        </div>
                        <motion.button whileTap={{ scale: 0.94 }} onClick={() => confirmFee(p.id)} className="btn btn-line btn-sm">
                          Confirm & mint pass
                        </motion.button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </Section>
            </Reveal>
          )}

          <Reveal>
            <Section title={isTreasurer ? 'Ready to pay' : 'Approved, waiting for the treasurer'}>
              {toPay.length ? (
                <>
                  <LedgerHead compact />
                  {toPay.map((r) => (
                    <RequestRow key={r.id} req={r} compact />
                  ))}
                </>
              ) : (
                <Empty title="Nothing waiting" />
              )}
            </Section>
          </Reveal>
        </div>

        <div className="flex min-w-0 flex-col gap-14">
          <Reveal delay={0.1}>
            <div className="box p-6">
              <h2 className="semi-wide text-[17px] font-semibold">New spending request</h2>
              <p className="mb-5 mt-1 text-sm text-ink-3">Saved to NEAR as soon as you submit.</p>
              <NewRequestForm />
            </div>
          </Reveal>

          <Reveal>
            <Section title="Your requests">
              {mine.length ? mine.map((r) => <RequestRow key={r.id} req={r} compact />) : <Empty title="No requests yet" />}
            </Section>
          </Reveal>
        </div>
      </div>
    </>
  )
}
