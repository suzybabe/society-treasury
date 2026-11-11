'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Reveal } from '../components/motion'
import { Avatar, Empty, PageHeader, RoleBadge } from '../components/ui'
import { eur, passNo } from '../lib/format'
import { isCommittee, requiredYes } from '../lib/rules'
import type { Role, Settings as SettingsT } from '../lib/types'
import { useMe, useTreasury } from '../state/store'

function Group({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <Reveal>
      <div className="grid grid-cols-1 gap-6 border-b border-ink/12 py-10 lg:grid-cols-[280px_1fr] lg:gap-12">
        <div>
          <h2 className="semi-wide text-[17px] font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-ink-3">{desc}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </Reveal>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-3">{hint}</span>}
    </label>
  )
}

export default function Settings() {
  const me = useMe()
  const { settings, members, updateSettings, setMemberRole, handover } = useTreasury()
  const [draft, setDraft] = useState<SettingsT>(settings)
  const [nextPres, setNextPres] = useState('')
  const [confirming, setConfirming] = useState(false)

  if (me.role !== 'president') {
    return (
      <div>
        <Empty title="President only" sub="The president manages the voting rules and the committee. Every change is recorded on-chain for all members to see." />
        <Link href="/home" className="btn btn-line btn-sm">
          Back home
        </Link>
      </div>
    )
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)
  const committeeCount = members.filter((m) => isCommittee(m.role)).length
  const typicalEligible = Math.max(committeeCount - 1, 0)
  const need = requiredYes(typicalEligible, draft.approvalPercent)
  const set = <K extends keyof SettingsT>(k: K, v: SettingsT[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const others = members.filter((m) => m.id !== me.id)

  return (
    <>
      <PageHeader eyebrow="Settings · president only" title="Settings" sub="Every change is a public transaction. Members can always see who changed what, and when." />

      <Group title="Voting rules" desc="How many committee votes it takes to approve spending.">
        <div className="flex items-end justify-between">
          <span className="label">Approval threshold</span>
          <motion.span key={draft.approvalPercent} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="num font-dot text-4xl font-black">
            &gt;{draft.approvalPercent}%
          </motion.span>
        </div>
        <input type="range" className="range mt-4" min={50} max={90} step={5} value={draft.approvalPercent} onChange={(e) => set('approvalPercent', Number(e.target.value))} />
        <div className="mt-2 flex justify-between font-mono text-[10.5px] text-ink-3">
          <span>Simple majority</span>
          <span>Supermajority</span>
        </div>
        <p className="mt-4 text-sm text-ink-2">
          With {committeeCount} committee members, a request usually has {typicalEligible} eligible voters, because the requester can’t vote. It needs{' '}
          <span className="font-semibold text-ink">{need} yes votes</span>. At least 2 are always needed, so nobody can approve alone.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Auto-approve under (€)" hint="Skips the vote. A receipt is still required.">
            <input className="input font-mono" type="number" min={0} step={1} value={draft.autoApproveLimit} onChange={(e) => set('autoApproveLimit', Math.max(0, Number(e.target.value)))} />
          </Field>
          <Field label="Membership fee (€)" hint="Applies to new passes only.">
            <input className="input font-mono" type="number" min={0} step={1} value={draft.membershipFee} onChange={(e) => set('membershipFee', Math.max(0, Number(e.target.value)))} />
          </Field>
        </div>
      </Group>

      <Group title="Society" desc="Shown on passes and across the app.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Society name">
            <input className="input" value={draft.societyName} onChange={(e) => set('societyName', e.target.value)} />
          </Field>
          <Field label="Short name">
            <input className="input font-mono uppercase" maxLength={10} value={draft.shortName} onChange={(e) => set('shortName', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Current term" hint="Changes at handover.">
            <input className="input font-mono" value={draft.term} disabled />
          </Field>
        </div>
      </Group>

      <Group title="Committee" desc="Who can make requests and vote. Only one treasurer at a time.">
        <ul>
          {[me, ...others].map((m) => (
            <motion.li layout key={m.id} className="flex items-center gap-3 border-b border-ink/12 py-3 first:pt-0">
              <Avatar name={m.name} size={30} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {m.name} {m.id === me.id && <span className="font-normal text-ink-3">(you)</span>}
                </div>
                <div className="truncate font-mono text-[11px] text-ink-3">
                  {passNo(m.passId)} · {m.near}
                </div>
              </div>
              {m.role === 'president' ? (
                <RoleBadge role="president" />
              ) : (
                <select className="input !h-8 !w-36 !text-xs" value={m.role} onChange={(e) => setMemberRole(m.id, e.target.value as Role)}>
                  <option value="treasurer">Treasurer</option>
                  <option value="committee">Committee</option>
                  <option value="student">Student</option>
                </select>
              )}
            </motion.li>
          ))}
        </ul>
      </Group>

      <Group title="Handover" desc="At the end of term, pass the presidency to the next committee. Every pass, vote and receipt carries over.">
        <div className="max-w-md">
          <Field label="Next president">
            <select
              className="input"
              value={nextPres}
              onChange={(e) => {
                setNextPres(e.target.value)
                setConfirming(false)
              }}
            >
              <option value="">Choose a member</option>
              {others.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </Field>
          <AnimatePresence mode="wait" initial={false}>
            {!confirming ? (
              <motion.button key="start" exit={{ opacity: 0 }} disabled={!nextPres} onClick={() => setConfirming(true)} className="btn btn-danger mt-4">
                Start handover
              </motion.button>
            ) : (
              <motion.div key="confirm" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-4 rounded-md border border-brick/40 bg-brick/5 p-4 text-sm">
                  You’ll become a student and lose access to Settings. This is recorded on NEAR, and you can’t undo it yourself.
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setConfirming(false)} className="btn btn-line btn-sm">
                      Cancel
                    </button>
                    <button onClick={() => handover(nextPres)} className="btn btn-sm bg-brick text-white">
                      Confirm handover
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Group>

      {/* Sticky save bar slides up when there are unsaved changes */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-ink bg-paper/95 backdrop-blur"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-ink-2">
                Unsaved changes. Current rules: more than {settings.approvalPercent}%, auto-approve under {eur(settings.autoApproveLimit)}.
              </span>
              <div className="flex gap-2">
                <button onClick={() => setDraft(settings)} className="btn btn-line btn-sm">
                  Discard
                </button>
                <button onClick={() => updateSettings(draft)} className="btn btn-ink btn-sm">
                  Save to NEAR
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
