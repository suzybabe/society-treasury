'use client'

import { Check, Loader2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CountUp, EASE, int, Reveal } from '../components/motion'
import { LedgerHead, RequestRow } from '../components/RequestRow'
import { Empty, Figure, PageHeader, Section, VoteMeter } from '../components/ui'
import { eur, timeAgo } from '../lib/format'
import { isCommittee, MIN_ELIGIBLE_VOTERS, requiredYes, tally, voteBlock } from '../lib/rules'
import { CATEGORIES, type Category } from '../lib/types'
import { memberById, useMe, useTreasury } from '../state/store'

function NewEventForm() {
  const { createEvent } = useTreasury()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [when, setWhen] = useState('')
  const [busy, setBusy] = useState(false)
  const valid = name.trim().length > 1 && location.trim().length > 1 && !!when

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    const ok = await createEvent({ name: name.trim(), location: location.trim(), startsAt: new Date(when).toISOString() })
    setBusy(false)
    if (ok) {
      setName('')
      setLocation('')
      setWhen('')
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input className="input" placeholder="Event name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <input className="input" placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Date and time" />
      </div>
      <button disabled={!valid || busy} className="btn btn-line">
        {busy ? <Loader2 size={16} className="animate-spin" /> : 'Add event'}
      </button>
    </form>
  )
}

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
  const [busy, setBusy] = useState(false)

  const n = Number(amount)
  const eligible = members.filter((m) => isCommittee(m.role) && m.id !== me.id).length
  const enoughVoters = eligible >= MIN_ELIGIBLE_VOTERS
  const valid = title.trim().length > 2 && n > 0 && enoughVoters
  const need = requiredYes(eligible, settings.approvalPercent)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    const id = await submitRequest({ title: title.trim(), description: description.trim(), category, amount: Math.round(n * 100) / 100 })
    setBusy(false)
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

      <div className="rounded-md bg-ink/[0.05] p-3 text-sm text-ink-2">
        Every request goes to a committee vote. This one needs <span className="font-semibold text-ink">{need} of {eligible}</span> yes votes, and you can’t vote on your own request.
        {!enoughVoters && (
          <span className="mt-1 block text-brick">
            You need at least 3 committee members before requests can be voted on, because nobody can approve spending alone. The president can add them in Settings.
          </span>
        )}
      </div>

      <button disabled={!valid || busy} className="btn btn-ink">
        {busy ? <Loader2 size={16} className="animate-spin" /> : 'Submit request'}
      </button>
    </form>
  )
}

export default function Committee() {
  const me = useMe()
  const { requests, members, settings, payments, castVote } = useTreasury()

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
        sub={`${members.filter((m) => isCommittee(m.role)).length} members. Every request needs more than ${settings.approvalPercent}% of eligible votes, and at least two approvals.`}
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
            <Figure label="Awaiting approval" value={<CountUp value={payments.length} format={int} />} />
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

          {payments.length > 0 && (
            <Reveal>
              <Link href="/members" className="box group flex items-center justify-between gap-4 p-5 transition hover:border-ink">
                <div>
                  <div className="font-semibold">{payments.length} new member{payments.length > 1 ? 's' : ''} waiting for approval</div>
                  <div className="text-sm text-ink-3">{isTreasurer ? 'Review their proof of payment and issue passes.' : 'The treasurer approves them in Members.'}</div>
                </div>
                <span className="font-medium transition group-hover:translate-x-1">Members →</span>
              </Link>
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
              <p className="mb-5 mt-1 text-sm text-ink-3">Every member can see it as soon as you submit. It can’t be edited afterwards.</p>
              <NewRequestForm />
            </div>
          </Reveal>

          <Reveal>
            <div className="box p-6">
              <h2 className="semi-wide text-[17px] font-semibold">New event</h2>
              <p className="mb-5 mt-1 text-sm text-ink-3">Members check in to it from their home page.</p>
              <NewEventForm />
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
