'use client'

import { Check, FileText, Loader2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { EASE, Reveal } from '../components/motion'
import { Avatar, Empty, PageHeader, RoleBadge, Section } from '../components/ui'
import { errorMessage } from '../lib/api'
import { eur, passNo, shortDate, timeAgo } from '../lib/format'
import type { FeeMethod, FeePayment } from '../lib/types'
import { useSession } from '../state/session'
import { useMe, useTreasury } from '../state/store'

const METHOD_LABEL: Record<FeeMethod, string> = { cash: 'Cash', card: 'Card', bank: 'Bank transfer' }

/** Opens a proof-of-payment file in a new tab (it needs the member's token, so it's fetched first). */
function ViewProofButton({ proofId }: { proofId: string }) {
  const { apiResponse } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const open = async () => {
    // Open the tab now, while we still have the click, then point it at the file.
    const tab = window.open('', '_blank')
    setBusy(true)
    setError(null)
    try {
      const blob = await (await apiResponse(`/api/fee-proofs/${proofId}`)).blob()
      const url = URL.createObjectURL(blob)
      if (tab) tab.location.href = url
      else window.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      tab?.close()
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button onClick={open} disabled={busy} className="btn btn-line btn-sm">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} View proof
      </button>
      {error && <span className="text-xs text-brick">{error}</span>}
    </>
  )
}

function ApprovalRow({ p, canApprove }: { p: FeePayment; canApprove: boolean }) {
  const { settings, confirmFee, rejectFee } = useTreasury()
  const sub = p.submission
  const [method, setMethod] = useState<FeeMethod>(sub?.method ?? 'cash')
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 60, transition: { duration: 0.3, ease: EASE } }}
      className="border-b border-ink/12 py-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <Avatar name={p.name} size={36} />
          <div className="min-w-0">
            <div className="truncate font-medium">{p.name}</div>
            <div className="truncate text-xs text-ink-3">{p.email}</div>
            <div className="mt-1.5">
              {sub ? (
                <span className="inline-flex items-center gap-1.5 rounded-[3px] bg-sun px-1.5 py-[3px] font-mono text-[10.5px] font-medium uppercase leading-none text-ink">
                  Proof sent · {METHOD_LABEL[sub.method]} · {timeAgo(sub.submittedAt)}
                </span>
              ) : (
                <span className="font-mono text-[10.5px] uppercase text-ink-3">No proof yet · signed up {timeAgo(p.submittedAt)}</span>
              )}
            </div>
          </div>
        </div>
        {sub && (
          <div className="flex shrink-0 items-center gap-2">
            <ViewProofButton proofId={sub.id} />
          </div>
        )}
      </div>

      {canApprove ? (
        <AnimatePresence mode="wait" initial={false}>
          {rejecting ? (
            <motion.form
              key="reject"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
              onSubmit={async (e) => {
                e.preventDefault()
                setBusy('reject')
                const ok = await rejectFee(p.id, note.trim())
                setBusy(null)
                if (ok) setRejecting(false)
              }}
            >
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input className="input !h-[2.1rem] !text-sm" autoFocus minLength={3} maxLength={300} required placeholder="What’s wrong? e.g. amount doesn’t match €15" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRejecting(false)} className="btn btn-line btn-sm">
                    Cancel
                  </button>
                  <button disabled={busy !== null || note.trim().length < 3} className="btn btn-danger btn-sm">
                    {busy === 'reject' ? <Loader2 size={14} className="animate-spin" /> : 'Send rejection'}
                  </button>
                </div>
              </div>
            </motion.form>
          ) : (
            <motion.div key="actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 flex flex-wrap items-center gap-2">
              <select className="input !h-[2.1rem] !w-36 !text-xs" value={method} onChange={(e) => setMethod(e.target.value as FeeMethod)} aria-label="How they paid">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="bank">Bank transfer</option>
              </select>
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={busy !== null}
                onClick={async () => {
                  setBusy('approve')
                  await confirmFee(p.id, method)
                  setBusy(null)
                }}
                className="btn btn-ink btn-sm"
              >
                {busy === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve & issue pass
              </motion.button>
              {sub && (
                <button disabled={busy !== null} onClick={() => setRejecting(true)} className="btn btn-danger btn-sm">
                  <X size={14} /> Reject
                </button>
              )}
              <span className="text-xs text-ink-3">Fee {eur(settings.membershipFee)}</span>
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <p className="mt-3 text-xs text-ink-3">The treasurer approves new members.</p>
      )}
    </motion.div>
  )
}

export default function Members() {
  const me = useMe()
  const { members, payments } = useTreasury()
  const seesApprovals = me.role === 'treasurer' || me.role === 'president'
  const withProof = payments.filter((p) => p.submission).length

  return (
    <>
      <PageHeader
        eyebrow="Members"
        title="Members"
        sub={
          seesApprovals
            ? payments.length
              ? `${payments.length} waiting for approval${withProof ? `, ${withProof} with proof of payment` : ''}.`
              : 'No one is waiting for approval.'
            : `${members.length} members with a pass this term.`
        }
      />

      {seesApprovals && (
        <Reveal>
          <Section title="Waiting for approval" right={<span className="font-mono text-xs text-ink-3">{payments.length} pending</span>}>
            {payments.length === 0 && <Empty title="All caught up" sub="New sign-ups appear here. Students send proof of payment from their sign-in page." />}
            <AnimatePresence initial={false}>
              {payments.map((p) => (
                <ApprovalRow key={p.id} p={p} canApprove={me.role === 'treasurer'} />
              ))}
            </AnimatePresence>
          </Section>
        </Reveal>
      )}

      <Reveal className={seesApprovals ? 'mt-14' : ''}>
        <Section title="Members with a pass" right={<span className="font-mono text-xs text-ink-3">{members.length}</span>}>
          <ul>
            {members.map((m) => (
              <li key={m.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-ink/12 py-3 sm:grid-cols-[64px_auto_1fr_auto_auto]">
                <span className="hidden font-mono text-xs text-ink-3 sm:block">{passNo(m.passId)}</span>
                <Avatar name={m.name} size={30} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {m.name} {m.id === me.id && <span className="font-normal text-ink-3">(you)</span>}
                  </div>
                  <div className="truncate font-mono text-[11px] text-ink-3">{m.near ?? 'NEAR wallet pending'}</div>
                </div>
                <RoleBadge role={m.role} />
                <span className="hidden text-xs text-ink-3 sm:block">since {shortDate(m.joinedAt)}</span>
              </li>
            ))}
          </ul>
        </Section>
      </Reveal>
    </>
  )
}
