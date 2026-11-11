'use client'

import { Check, Clock, FileText, Loader2, LogOut, Upload, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState, type FormEvent } from 'react'
import { errorMessage } from '../lib/api'
import { timeAgo } from '../lib/format'
import type { FeeMethod } from '../lib/types'
import { useSession } from '../state/session'
import { EASE } from './motion'

const METHOD_LABEL: Record<FeeMethod, string> = { cash: 'Cash', card: 'Card', bank: 'Bank transfer' }

/**
 * Shown while a student waits for their membership. They pay the treasurer,
 * then submit proof (name, method, receipt). Once submitted, they see that
 * it's being reviewed; if it's rejected, they see why and can try again.
 */
export function PendingMembership() {
  const session = useSession()
  const me = session.me!
  const submission = me.feeSubmission
  const [formOpen, setFormOpen] = useState(false)

  const reviewing = submission?.status === 'reviewing'
  const rejected = submission?.status === 'rejected'

  return (
    <div className="box overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {reviewing ? (
          <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="p-5">
            <div className="flex items-center gap-2 font-semibold">
              <span className="relative grid h-6 w-6 place-items-center rounded-full bg-sun text-ink">
                <span className="absolute inset-0 animate-ping rounded-full bg-sun/60" />
                <Clock size={13} className="relative" />
              </span>
              Your payment is being reviewed
            </div>
            <p className="mt-2 text-sm text-ink-2">
              The treasurer will check your proof of payment and issue your membership pass. This page opens the treasury automatically once it’s approved.
            </p>
            <dl className="mt-4 space-y-1 font-mono text-[11px] text-ink-3">
              <div>Name · {me.name}</div>
              <div>Paid by · {METHOD_LABEL[submission.method]}</div>
              <div className="truncate">Proof · {submission.fileName}</div>
              <div>Sent · {timeAgo(submission.submittedAt)}</div>
            </dl>
          </motion.div>
        ) : formOpen ? (
          <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}>
            <ProofForm defaultName={me.name ?? ''} onCancel={() => setFormOpen(false)} />
          </motion.div>
        ) : (
          <motion.div key="intro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="p-5">
            {rejected ? (
              <>
                <div className="flex items-center gap-2 font-semibold">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-brick text-white">
                    <X size={13} />
                  </span>
                  Your proof of payment wasn’t accepted
                </div>
                <p className="mt-2 rounded-md bg-brick/8 px-3 py-2 text-sm text-ink">
                  <span className="text-ink-3">Treasurer’s note: </span>
                  {submission.note}
                </p>
                <p className="mt-3 text-sm text-ink-2">Fix the issue and send it again.</p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 font-semibold">
                  <Check size={16} className="text-leaf" /> You’re signed up, {me.name?.split(' ')[0]}.
                </div>
                <p className="mt-2 text-sm text-ink-2">
                  Pay the membership fee to the treasurer by cash, card or bank transfer. Then send your proof of payment so they can issue your pass.
                </p>
              </>
            )}
            <button onClick={() => setFormOpen(true)} className="btn btn-ink mt-4 w-full sm:w-auto">
              <Upload size={16} /> {rejected ? 'Send proof again' : 'I’ve paid, send proof'}
            </button>
            <dl className="mt-4 space-y-1 font-mono text-[11px] text-ink-3">
              <div>Email · {me.email}</div>
              <div className="truncate">NEAR account · {me.near ?? 'being created'}</div>
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="border-t border-ink/10 px-5 py-3">
        <button onClick={() => void session.signOut()} className="inline-flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink">
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </div>
  )
}

function ProofForm({ defaultName, onCancel }: { defaultName: string; onCancel: () => void }) {
  const { submitFeeProof } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(defaultName)
  const [method, setMethod] = useState<FeeMethod>('bank')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = name.trim().length >= 2 && !!file

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid || !file) return
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('name', name.trim())
      form.append('method', method)
      form.append('file', file)
      await submitFeeProof(form)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 p-5">
      <div className="font-semibold">Send proof of payment</div>
      <label className="block">
        <span className="label mb-1.5 block">Your full name, as on your student card</span>
        <input className="input" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </label>
      <div>
        <span className="label mb-1.5 block">How did you pay?</span>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(METHOD_LABEL) as FeeMethod[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`rounded-md border px-2 py-2.5 text-sm font-medium transition ${method === m ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:border-ink'}`}
            >
              {METHOD_LABEL[m]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="label mb-1.5 block">Receipt or screenshot</span>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-ink/30 bg-paper/50 px-4 py-6 text-sm transition hover:border-ink"
        >
          {file ? (
            <>
              <FileText size={18} />
              <span className="max-w-full truncate font-mono text-xs">{file.name}</span>
              <span className="text-xs text-ink-3">Tap to change</span>
            </>
          ) : (
            <>
              <Upload size={18} className="transition group-hover:-translate-y-1" />
              <span>{method === 'cash' ? 'Photo of the cash receipt from the treasurer' : 'Bank or card payment screenshot'}</span>
              <span className="text-xs text-ink-3">Image or PDF, up to 5 MB</span>
            </>
          )}
        </button>
      </div>
      {error && <p className="text-sm text-brick">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="btn btn-line">
          Cancel
        </button>
        <button disabled={!valid || busy} className="btn btn-ink flex-1">
          {busy ? <Loader2 size={16} className="animate-spin" /> : 'Submit for review'}
        </button>
      </div>
    </form>
  )
}
