import type { ReactNode } from 'react'
import { shortHash } from '../lib/chain'
import { initials } from '../lib/format'
import type { Role, Status } from '../lib/types'

export const STATUS_META: Record<Status, { label: string; cls: string; swatch: string }> = {
  voting: { label: 'Voting', cls: 'bg-sun text-ink', swatch: 'bg-sun' },
  approved: { label: 'Approved', cls: 'bg-cobalt text-white', swatch: 'bg-cobalt' },
  auto: { label: 'Auto-approved', cls: 'bg-leaf text-white', swatch: 'bg-leaf' },
  spent: { label: 'Spent', cls: 'bg-ink text-paper', swatch: 'bg-ink' },
  rejected: { label: 'Rejected', cls: 'text-brick ring-1 ring-inset ring-brick', swatch: 'ring-1 ring-inset ring-brick' },
}

export function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status]
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-[3px] px-1.5 py-[3px] font-mono text-[10.5px] font-medium uppercase leading-none tracking-wide ${m.cls}`}>
      {m.label}
    </span>
  )
}

export const ROLE_META: Record<Role, { label: string; swatch: string }> = {
  president: { label: 'President', swatch: 'bg-accent' },
  treasurer: { label: 'Treasurer', swatch: 'bg-cobalt' },
  committee: { label: 'Committee', swatch: 'bg-ink' },
  student: { label: 'Student', swatch: 'ring-1 ring-inset ring-ink-3' },
}

export function RoleBadge({ role }: { role: Role }) {
  const m = ROLE_META[role]
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-2">
      <span className={`h-2 w-2 rounded-full ${m.swatch}`} />
      {m.label}
    </span>
  )
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-ink/[0.07] font-medium text-ink-2"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  )
}

export function TxChip({ tx, className = '' }: { tx: string; className?: string }) {
  return (
    <span
      title={`Mock transaction ${tx}. Will link to the NEAR explorer once the contract is deployed.`}
      className={`font-mono text-[11px] text-ink-3 ${className}`}
    >
      tx {shortHash(tx)}
    </span>
  )
}

export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-10 flex flex-col gap-5 border-b border-ink pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="label">{eyebrow}</div>
        <h1 className="wide mt-2 text-4xl font-bold tracking-tight text-balance sm:text-5xl">{title}</h1>
        {sub && <p className="mt-3 max-w-xl text-ink-2">{sub}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function Section({ title, right, children, className = '' }: { title: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-1 flex items-baseline justify-between gap-4 border-b border-ink/80 pb-2">
        <h2 className="semi-wide text-[17px] font-semibold tracking-tight">{title}</h2>
        {right && <div className="text-sm">{right}</div>}
      </div>
      {children}
    </section>
  )
}

export function Figure({ label, value, hint, big = false }: { label: string; value: ReactNode; hint?: ReactNode; big?: boolean }) {
  return (
    <div className="py-5 pr-4">
      <div className="label">{label}</div>
      <div className={`num mt-2 leading-none tracking-tight ${big ? 'font-dot text-[2.6rem] font-black sm:text-5xl' : 'wide text-2xl font-semibold sm:text-[1.7rem]'}`}>{value}</div>
      {hint && <div className="mt-2 text-xs text-ink-3">{hint}</div>}
    </div>
  )
}

export function SpecList({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl>
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-baseline justify-between gap-6 border-b border-ink/12 py-2.5 text-sm">
          <dt className="text-ink-3">{k}</dt>
          <dd className="min-w-0 truncate text-right">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** One cell per eligible voter. A tick marks the pass line. */
export function VoteMeter({ yes, no, eligible, need }: { yes: number; no: number; eligible: number; need: number }) {
  const cells = Array.from({ length: eligible }, (_, i) => (i < yes ? 'yes' : i >= eligible - no ? 'no' : 'empty'))
  return (
    <div className="flex items-center gap-1">
      {cells.map((c, i) => (
        <div key={i} className="flex flex-1 items-center gap-1">
          <div
            className={`h-3 flex-1 rounded-[2px] ${
              c === 'yes' ? 'bg-ink' : c === 'no' ? 'bg-brick' : 'border border-ink/25'
            }`}
          />
          {i === need - 1 && i !== eligible - 1 && <div className="h-5 w-[2px] bg-accent" />}
        </div>
      ))}
    </div>
  )
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="py-8 text-sm">
      <div className="font-medium">{title}</div>
      {sub && <div className="mt-1 max-w-sm text-ink-3">{sub}</div>}
    </div>
  )
}

export function Logo({ short }: { short: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-accent">
        <span className="h-2.5 w-2.5 rounded-full bg-ink" />
      </span>
      <span className="wide text-[15px] font-bold lowercase tracking-tight">
        {short} treasury
      </span>
    </div>
  )
}
