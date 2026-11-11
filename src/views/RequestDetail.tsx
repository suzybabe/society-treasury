'use client'

import { ArrowLeft, Check, Lock, Upload, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CountUp, EASE, Reveal } from '../components/motion'
import { Avatar, Empty, RoleBadge, Section, SpecList, StatusBadge, TxChip, VoteMeter } from '../components/ui'
import { blockOf } from '../lib/chain'
import { dateTime, eur, timeAgo } from '../lib/format'
import { tally, voteBlock, VOTE_BLOCK_TEXT } from '../lib/rules'
import type { SpendRequest } from '../lib/types'
import { memberById, useMe, useTreasury } from '../state/store'

function ReceiptPaper({ req, payer }: { req: SpendRequest; payer?: string }) {
  const r = req.receipt!
  if (r.previewUrl) {
    // A local blob: URL from the file picker, which next/image can't optimise.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={r.previewUrl} alt={r.fileName} className="max-h-96 rounded-md border border-ink/12 bg-white object-contain" />
  }
  return (
    <motion.div
      initial={{ y: -30, opacity: 0, rotate: 0 }}
      whileInView={{ y: 0, opacity: 1, rotate: -1.5 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 90, damping: 14 }}
      className="relative w-full max-w-xs bg-white text-[#141414] px-5 py-6 font-mono text-[11px] shadow-[0_18px_30px_-20px_rgb(0_0_0/0.5)]"
    >
      <div className="text-center text-xs font-medium tracking-widest">RECEIPT</div>
      <div className="text-center text-[10px] text-ink-3">{r.fileName}</div>
      <div className="my-3 border-t border-dashed border-ink/30" />
      <div className="flex justify-between gap-3">
        <span className="truncate">{req.title}</span>
        <span>{eur(req.amount)}</span>
      </div>
      <div className="text-ink-3">{req.category} ×1</div>
      <div className="my-3 border-t border-dashed border-ink/30" />
      <div className="flex justify-between text-sm font-medium">
        <span>TOTAL</span>
        <span>{eur(req.amount)}</span>
      </div>
      <div className="mt-3 text-[10px] text-ink-3">
        {dateTime(r.uploadedAt)} · paid by {payer}
      </div>
      <motion.div
        initial={{ scale: 2.2, opacity: 0, rotate: -30 }}
        whileInView={{ scale: 1, opacity: 0.85, rotate: -14 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.5 }}
        className="absolute right-4 top-9 border-2 border-accent px-2 py-0.5 text-sm font-medium tracking-widest text-accent"
      >
        PAID
      </motion.div>
    </motion.div>
  )
}

export default function RequestDetail() {
  const id = decodeURIComponent(useParams<{ id: string }>().id ?? "")
  const me = useMe()
  const { requests, members, settings, castVote, markSpent } = useTreasury()
  const req = requests.find((r) => r.id === id)
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  if (!req) {
    return (
      <div>
        <Empty title={`There’s no request called ${id}`} sub="Check the reference. Records on NEAR are never deleted." />
        <Link href="/spending" className="btn btn-line btn-sm">
          Back to spending
        </Link>
      </div>
    )
  }

  const requester = memberById(members, req.requesterId)
  const t = tally(req, members, settings)
  const block = voteBlock(req, me)
  const isAuto = req.status === 'auto' || (req.votes.length === 0 && req.amount < settings.autoApproveLimit && req.status !== 'voting')
  const decided = req.status !== 'voting'
  const approved = ['approved', 'auto', 'spent'].includes(req.status)
  const canPay = me.role === 'treasurer' && (req.status === 'approved' || req.status === 'auto')
  const payer = req.receipt && memberById(members, req.receipt.paidBy)?.name

  const steps: { label: string; sub?: string; state: 'done' | 'now' | 'todo' | 'fail' }[] = [
    { label: 'Submitted', sub: dateTime(req.createdAt), state: 'done' },
    isAuto
      ? { label: 'Auto-approved', sub: `Under ${eur(settings.autoApproveLimit)}`, state: 'done' }
      : req.status === 'rejected'
        ? { label: 'Rejected', sub: req.decidedAt && dateTime(req.decidedAt), state: 'fail' }
        : { label: decided ? 'Approved' : 'Committee vote', sub: decided ? req.decidedAt && dateTime(req.decidedAt) : `${t.yes} of ${t.need} yes votes`, state: decided ? 'done' : 'now' },
  ]
  if (req.status !== 'rejected')
    steps.push({
      label: req.status === 'spent' ? 'Paid' : 'Payment',
      sub: req.receipt ? `${dateTime(req.receipt.uploadedAt)} · ${payer}` : approved ? 'Waiting for the treasurer' : 'After approval',
      state: req.status === 'spent' ? 'done' : approved ? 'now' : 'todo',
    })

  return (
    <>
      <Link href="/spending" className="group mb-8 inline-flex items-center gap-2 text-sm text-ink-3 hover:text-ink">
        <ArrowLeft size={15} className="transition group-hover:-translate-x-1" /> Spending / <span className="font-mono text-xs">{req.id}</span>
      </Link>

      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <Reveal>
            <div className="label">
              {req.category} · {req.id}
            </div>
            <h1 className="wide mt-2 text-4xl font-bold tracking-tight text-balance sm:text-5xl">{req.title}</h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-2">{req.description}</p>
            {requester && (
              <div className="mt-6 flex items-center gap-3">
                <Avatar name={requester.name} />
                <div className="text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{requester.name}</span> <RoleBadge role={requester.role} />
                  </div>
                  <div className="text-xs text-ink-3">Requested {timeAgo(req.createdAt)}</div>
                </div>
              </div>
            )}
          </Reveal>

          <Reveal className="mt-14">
            <Section title="Votes" right={!isAuto && <span className="font-mono text-xs text-ink-3">{t.yes} yes · {t.no} no · {t.need} needed</span>}>
              {isAuto ? (
                <p className="py-5 text-sm text-ink-2">
                  No vote needed. It’s under the {eur(settings.autoApproveLimit)} limit set by the president. The treasurer still has to upload a receipt.
                </p>
              ) : (
                <>
                  <div className="py-5">
                    <VoteMeter yes={t.yes} no={t.no} eligible={t.eligible.length} need={t.need} />
                    <div className="mt-2 text-xs text-ink-3">
                      Needs {t.need} of {t.eligible.length} eligible voters. The coloured mark is the pass line. The requester can’t vote.
                    </div>
                  </div>
                  <ul>
                    {t.eligible.map((m) => {
                      const vote = req.votes.find((v) => v.memberId === m.id)
                      return (
                        <li key={m.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-ink/12 py-3 sm:grid-cols-[auto_1fr_auto_auto]">
                          <Avatar name={m.name} size={28} />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {m.name} {m.id === me.id && <span className="font-normal text-ink-3">(you)</span>}
                            </div>
                            <div className="text-xs text-ink-3">{vote ? dateTime(vote.at) : decided ? 'Didn’t vote' : 'Hasn’t voted yet'}</div>
                          </div>
                          {vote ? <TxChip tx={vote.tx} className="hidden sm:inline" /> : <span className="hidden sm:inline" />}
                          <AnimatePresence mode="wait">
                            {vote ? (
                              <motion.span
                                key="v"
                                initial={{ scale: 0.6, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                                className={`inline-flex w-14 items-center justify-center gap-1 rounded-[3px] py-1 font-mono text-[11px] font-medium ${
                                  vote.choice === 'yes' ? 'bg-ink text-paper' : 'bg-brick text-white'
                                }`}
                              >
                                {vote.choice === 'yes' ? <Check size={12} /> : <X size={12} />} {vote.choice.toUpperCase()}
                              </motion.span>
                            ) : (
                              <span className="inline-flex w-14 justify-center rounded-[3px] border border-dashed border-ink/25 py-1 font-mono text-[11px] text-ink-3">…</span>
                            )}
                          </AnimatePresence>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </Section>
          </Reveal>

          <Reveal className="mt-14">
            <Section title="Receipt" right={req.receipt && <TxChip tx={req.receipt.tx} />}>
              <div className="py-6">
                {req.receipt ? (
                  <ReceiptPaper req={req} payer={payer} />
                ) : canPay ? (
                  <div className="max-w-lg">
                    <p className="text-sm text-ink-2">
                      Pay <span className="font-mono">{eur(req.amount)}</span> from the society bank account, then upload the receipt. This marks the request Spent, and it can’t be undone.
                    </p>
                    <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="group mt-4 flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-ink/30 bg-card px-4 py-8 text-sm transition hover:border-ink"
                    >
                      <Upload size={18} className="transition group-hover:-translate-y-1" />
                      {file ? <span className="font-mono">{file.name}</span> : 'Choose a receipt (image or PDF)'}
                    </button>
                    <button disabled={!file} onClick={() => markSpent(req.id, file)} className="btn btn-ink mt-3 w-full">
                      Upload and mark Spent
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-ink-3">{req.status === 'rejected' ? 'Rejected, so no money was spent.' : 'The treasurer uploads it after paying.'}</p>
                )}
              </div>
            </Section>
          </Reveal>
        </div>

        {/* Price box */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
          className="box p-6 lg:sticky lg:top-24"
        >
          <div className="flex items-center justify-between">
            <span className="label">Amount</span>
            <StatusBadge status={req.status} />
          </div>
          <div className="num mt-3 font-dot text-6xl font-black leading-none tracking-tight">
            <CountUp value={req.amount} format={eur} />
          </div>

          <ol className="mt-7">
            {steps.map((s, i) => (
              <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                {i < steps.length - 1 && <span className={`absolute left-[11px] top-6 bottom-0 w-px ${s.state === 'done' ? 'bg-ink' : 'bg-ink/15'}`} />}
                <span
                  className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] ${
                    s.state === 'done' ? 'bg-ink text-paper' : s.state === 'fail' ? 'bg-brick text-white' : s.state === 'now' ? 'bg-accent text-on-accent' : 'border border-ink/25 text-ink-3'
                  }`}
                >
                  {s.state === 'now' && <span className="absolute inset-0 animate-ping rounded-full bg-accent/50" />}
                  <span className="relative">{s.state === 'done' ? <Check size={12} /> : s.state === 'fail' ? <X size={12} /> : i + 1}</span>
                </span>
                <div className="-mt-0.5">
                  <div className={`text-sm font-medium ${s.state === 'todo' ? 'text-ink-3' : ''}`}>{s.label}</div>
                  {s.sub && <div className="text-xs text-ink-3">{s.sub}</div>}
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6">
            {block === null ? (
              <div className="grid grid-cols-2 gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => castVote(req.id, 'no')} className="btn btn-danger">
                  <X size={16} /> No
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => castVote(req.id, 'yes')} className="btn btn-ink">
                  <Check size={16} /> Yes
                </motion.button>
                <p className="col-span-2 mt-1 text-center text-xs text-ink-3">Your vote is permanent once you submit it.</p>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-md bg-ink/[0.05] p-3 text-sm text-ink-2">
                <Lock size={14} className="mt-0.5 shrink-0" /> {VOTE_BLOCK_TEXT[block]}
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="label mb-1">On-chain record</div>
            <SpecList
              rows={[
                ['Transaction', <TxChip key="tx" tx={req.tx} />],
                ['Block', <span key="block" className="num font-mono text-xs">{blockOf(req.tx).toLocaleString()}</span>],
                ['Contract', <span key="contract" className="font-mono text-xs">treasury.{settings.shortName.toLowerCase()}.testnet</span>],
                ['Votes stored', <span key="votes" className="font-mono text-xs">{req.votes.length}</span>],
              ]}
            />
          </div>
        </motion.aside>
      </div>
    </>
  )
}
