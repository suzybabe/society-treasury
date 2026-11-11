'use client'

import { Check, GraduationCap, Loader2, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { canStudentVote, isCommittee, studentCount, type tally } from '../lib/rules'
import type { Member, Settings, SpendRequest } from '../lib/types'
import { useTreasury } from '../state/store'
import { EASE } from './motion'
import { ChainChip } from './ui'

/**
 * The student vote on a request: every member with a pass who isn't on the
 * committee can vote, and once enough have, their majority counts as one
 * committee vote.
 */
export function StudentVotePanel({ req, t, me, members, settings }: { req: SpendRequest; t: ReturnType<typeof tally>; me: Member; members: Member[]; settings: Settings }) {
  const { studentVote } = useTreasury()
  const [busy, setBusy] = useState<'yes' | 'no' | null>(null)
  const { yes, no, mine, myChain } = req.studentPoll
  const total = yes + no
  const quorum = settings.studentQuorum
  const students = studentCount(members)
  const yesShare = total ? (yes / total) * 100 : 0

  const status = !t.studentSeat
    ? { text: 'Not counted yet', tone: 'text-ink-3 ring-ink/20' }
    : t.bloc === true
      ? { text: 'Counts as YES', tone: 'text-leaf ring-leaf/40' }
      : t.bloc === false
        ? { text: 'Counts as NO', tone: 'text-brick ring-brick/40' }
        : total >= quorum
          ? { text: 'Tied, not counted', tone: 'text-ink-3 ring-ink/20' }
          : { text: `${quorum - total} more to count`, tone: 'text-accent ring-accent/40' }

  const vote = async (choice: 'yes' | 'no') => {
    setBusy(choice)
    await studentVote(req.id, choice)
    setBusy(null)
  }

  return (
    <div className="mt-6 rounded-xl border-2 border-ink/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <GraduationCap size={18} className="text-accent" /> Student vote
        </div>
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-wide ring-1 ring-inset ${status.tone}`}>{status.text}</span>
      </div>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-ink/10">
        <motion.div className="h-full bg-leaf" initial={{ width: 0 }} animate={{ width: `${yesShare}%` }} transition={{ duration: 0.6, ease: EASE }} />
        <motion.div className="h-full bg-brick" initial={{ width: 0 }} animate={{ width: total ? `${100 - yesShare}%` : 0 }} transition={{ duration: 0.6, ease: EASE }} />
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs">
        <span className="text-leaf">{yes} yes</span>
        <span className="text-brick">{no} no</span>
      </div>

      <p className="mt-3 text-sm text-ink-2">
        {t.studentSeat
          ? `Students’ majority counts as one committee vote once ${quorum} students have voted (${total} so far).`
          : `The student vote counts once the society has at least ${quorum} students with a pass. It has ${students} now, so this request is decided by the committee.`}
      </p>

      {mine ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md bg-ink/[0.05] p-3 text-sm">
          <span className={`inline-flex items-center gap-1 rounded-[3px] px-2 py-1 font-mono text-[11px] font-medium ${mine === 'yes' ? 'bg-leaf text-white' : 'bg-brick text-white'}`}>
            {mine === 'yes' ? <Check size={12} /> : <X size={12} />} You voted {mine.toUpperCase()}
          </span>
          <ChainChip chain={myChain} />
        </div>
      ) : canStudentVote(req, me) ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <motion.button whileTap={{ scale: 0.95 }} disabled={busy !== null} onClick={() => vote('no')} className="btn btn-danger">
            {busy === 'no' ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Vote no
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} disabled={busy !== null} onClick={() => vote('yes')} className="btn btn-ink">
            {busy === 'yes' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Vote yes
          </motion.button>
          <p className="col-span-2 text-center text-xs text-ink-3">Your vote is recorded on NEAR and can’t be changed.</p>
        </div>
      ) : isCommittee(me.role) ? (
        <p className="mt-3 text-xs text-ink-3">Students vote here. As a committee member, you vote in the committee vote above.</p>
      ) : null}
    </div>
  )
}
