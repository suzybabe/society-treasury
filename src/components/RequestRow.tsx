'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { eur, shortDate } from '../lib/format'
import { tally } from '../lib/rules'
import type { SpendRequest } from '../lib/types'
import { memberById, useTreasury } from '../state/store'
import { ChainDot, StatusBadge } from './ui'

const FULL = 'sm:grid-cols-[64px_84px_minmax(0,1fr)_120px_110px]'
const COMPACT = 'sm:grid-cols-[minmax(0,1fr)_120px_96px]'

export function LedgerHead({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`hidden gap-x-4 border-b border-ink/12 py-2 sm:grid ${compact ? COMPACT : FULL}`}>
      {!compact && <span className="label">Date</span>}
      {!compact && <span className="label">Ref</span>}
      <span className="label">Description</span>
      <span className="label">Status</span>
      <span className="label text-right">Amount</span>
    </div>
  )
}

export function RequestRow({ req, compact = false }: { req: SpendRequest; compact?: boolean }) {
  const { members, settings } = useTreasury()
  const requester = memberById(members, req.requesterId)
  const t = tally(req, members, settings)

  return (
    <Link
      href={`/spending/${req.id}`}
      className={`group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-ink/12 py-3 transition-[padding,background-color] duration-300 hover:bg-card hover:pl-3 hover:pr-3 ${compact ? COMPACT : FULL}`}
    >
      <span className="absolute inset-y-0 left-0 w-0 bg-accent transition-[width] duration-300 group-hover:w-[3px]" />
      {!compact && <span className="num hidden font-mono text-xs text-ink-3 sm:block">{shortDate(req.createdAt)}</span>}
      {!compact && <span className="hidden font-mono text-xs text-ink-3 sm:block">{req.id}</span>}

      <div className="min-w-0">
        <div className="flex items-center gap-2 font-medium">
          <span className="truncate">{req.title}</span>
          <ArrowRight size={14} className="shrink-0 -translate-x-2 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
        </div>
        <div className="mt-0.5 truncate text-xs text-ink-3">
          <span className={compact ? '' : 'sm:hidden'}>{req.id} · </span>
          {req.category} · {requester?.name ?? 'Unknown'}
          {req.status === 'voting' && ` · ${t.yes}/${t.need} votes`}
          {req.chain && (
            <>
              {' · '}
              <ChainDot chain={req.chain} />
            </>
          )}
        </div>
      </div>

      <span className="num text-right font-mono text-sm sm:order-last">{eur(req.amount)}</span>

      <span className="col-span-2 sm:col-span-1">
        <StatusBadge status={req.status} />
      </span>
    </Link>
  )
}
