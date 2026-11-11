'use client'

import { Plus, Search } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CountUp, EASE, Reveal } from '../components/motion'
import { LedgerHead, RequestRow } from '../components/RequestRow'
import { Empty, Figure, PageHeader, STATUS_META } from '../components/ui'
import { eur } from '../lib/format'
import { isCommittee } from '../lib/rules'
import type { Status } from '../lib/types'
import { memberById, useMe, useTreasury } from '../state/store'

const FILTERS: (Status | 'all')[] = ['all', 'voting', 'approved', 'auto', 'spent', 'rejected']

export default function SpendingLog() {
  const me = useMe()
  const { requests, members, totals } = useTreasury()
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [q, setQ] = useState('')

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: requests.length }
    for (const r of requests) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [requests])

  const shown = requests.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false
    if (!q.trim()) return true
    const hay = `${r.id} ${r.title} ${r.category} ${memberById(members, r.requesterId)?.name ?? ''}`.toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })
  const shownTotal = shown.reduce((s, r) => s + r.amount, 0)

  return (
    <>
      <PageHeader
        eyebrow="Spending log"
        title="Spending"
        sub="Every request, vote and receipt, stored on NEAR. Nothing here can be edited or deleted."
        actions={
          isCommittee(me.role) && (
            <Link href="/committee#new" className="btn btn-ink">
              <Plus size={16} /> New request
            </Link>
          )
        }
      />

      <Reveal>
        <div className="grid grid-cols-2 border-b border-ink/12 lg:grid-cols-4">
          <Figure label="Spent" value={<CountUp value={totals.spent} format={eur} />} />
          <div className="border-l border-ink/12 pl-5">
            <Figure label="Approved, unpaid" value={<CountUp value={totals.committed} format={eur} />} />
          </div>
          <div className="border-t border-ink/12 lg:border-l lg:border-t-0 lg:pl-5">
            <Figure label="Under vote" value={<CountUp value={totals.underVote} format={eur} />} />
          </div>
          <div className="border-l border-t border-ink/12 pl-5 lg:border-t-0">
            <Figure label="Balance" value={<CountUp value={totals.balance} format={eur} />} />
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1} className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="-mx-5 flex gap-1 overflow-x-auto px-5 lg:mx-0 lg:px-0">
          {FILTERS.map((f) => {
            const active = filter === f
            return (
              <button key={f} onClick={() => setFilter(f)} className="relative shrink-0 px-3 py-2 text-sm">
                <span className={`relative z-10 flex items-center gap-2 transition-colors ${active ? 'text-paper' : 'text-ink-2 hover:text-ink'}`}>
                  {f !== 'all' && <span className={`h-2 w-2 rounded-[2px] ${STATUS_META[f].swatch} ${active ? 'ring-1 ring-paper/40' : ''}`} />}
                  {f === 'all' ? 'All' : STATUS_META[f].label}
                  <span className={`font-mono text-[11px] ${active ? 'text-paper/60' : 'text-ink-3'}`}>{counts[f] ?? 0}</span>
                </span>
                {active && <motion.span layoutId="filter-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              </button>
            )
          })}
        </div>
        <label className="relative lg:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input className="input !pl-9" placeholder="Search by name, item or ref" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </Reveal>

      <div className="mt-4">
        <LedgerHead />
        <motion.div layout>
          <AnimatePresence initial={true} mode="popLayout">
            {shown.map((r, i) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE, delay: i * 0.03 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <RequestRow req={r} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
        {shown.length === 0 && <Empty title="No matching requests" sub="Try another filter or search." />}
        {shown.length > 0 && (
          <div className="flex justify-between border-b-2 border-ink py-3 text-sm font-semibold">
            <span>
              {shown.length} request{shown.length > 1 ? 's' : ''}
            </span>
            <span className="num font-mono">
              <CountUp value={shownTotal} format={eur} />
            </span>
          </div>
        )}
      </div>
    </>
  )
}
