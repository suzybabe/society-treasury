'use client'

import { ArrowRight, Check } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { KIND_TAG } from '../components/AppShell'
import { MembershipPass } from '../components/MembershipPass'
import { CountUp, EASE, int, Reveal, Stagger, StaggerItem } from '../components/motion'
import { LedgerHead, RequestRow } from '../components/RequestRow'
import { Figure, PageHeader, Section, SpecList, TxChip } from '../components/ui'
import { eur, longDate, passNo, shortDate, timeAgo } from '../lib/format'
import { isCommittee, voteBlock } from '../lib/rules'
import { useMe, useTreasury } from '../state/store'

export default function Home() {
  const me = useMe()
  const { settings, totals, requests, events, activity, checkedIn, checkIn } = useTreasury()
  const needsMyVote = requests.filter((r) => voteBlock(r, me) === null)

  return (
    <>
      <PageHeader
        eyebrow="Member home"
        title={me.name}
        sub={
          isCommittee(me.role)
            ? needsMyVote.length
              ? `${needsMyVote.length} request${needsMyVote.length > 1 ? 's need' : ' needs'} your vote.`
              : 'You’ve voted on everything that’s open.'
            : 'Your pass, and where the society’s money is going.'
        }
        actions={
          isCommittee(me.role) && needsMyVote.length > 0 ? (
            <Link href="/committee" className="btn btn-accent">
              Vote now
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 font-mono text-[11px] text-paper">{needsMyVote.length}</span>
            </Link>
          ) : (
            <Link href="/spending" className="btn btn-line">
              Spending log <ArrowRight size={16} />
            </Link>
          )
        }
      />

      {/* Pass: product shot + spec sheet */}
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <Reveal>
          <div className="grid aspect-[4/3] place-items-center rounded-md bg-stage">
            <motion.div
              className="w-[76%]"
              initial={{ rotate: -10, y: 30, opacity: 0 }}
              animate={{ rotate: -4, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 80, damping: 14, delay: 0.1 }}
            >
              <MembershipPass member={me} term={settings.term} shortName={settings.shortName} />
            </motion.div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="label">Your pass</div>
          <div className="wide mt-1 text-3xl font-bold tracking-tight">Pass {passNo(me.passId)}</div>
          <div className="mt-5">
            <SpecList
              rows={[
                ['Holder', me.name],
                ['NEAR account', <span key="near" className="font-mono text-xs">{me.near}</span>],
                ['Term', settings.term],
                ['Issued', shortDate(me.joinedAt)],
                [
                  'Status',
                  <span key="status" className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 animate-[blink_2s_ease-in-out_infinite] rounded-full bg-leaf" /> Valid
                  </span>,
                ],
              ]}
            />
          </div>
          <p className="mt-4 text-sm text-ink-3">Show the QR code at the door to check in to events.</p>
        </Reveal>
      </div>

      {/* Treasury figures */}
      <Reveal className="mt-16">
        <Section
          title="Treasury"
          right={
            <Link href="/spending" className="group inline-flex items-center gap-1 font-medium">
              Spending log <ArrowRight size={14} className="transition group-hover:translate-x-1" />
            </Link>
          }
        >
          <div className="grid grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div className="col-span-2 lg:col-span-1">
              <Figure big label="Balance" value={<CountUp value={totals.balance} format={eur} />} hint={`Includes ${eur(totals.carriedOver)} carried over`} />
            </div>
            <div className="border-ink/12 lg:border-l lg:pl-5">
              <Figure label="Fees collected" value={<CountUp value={totals.collected} format={eur} />} hint={`${totals.passes} passes`} />
            </div>
            <div className="border-l border-ink/12 pl-5">
              <Figure label="Spent" value={<CountUp value={totals.spent} format={eur} />} hint="All with receipts" />
            </div>
            <div className="col-span-2 border-t border-ink/12 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-5 lg:col-span-1">
              <Figure label="Approved, unpaid" value={<CountUp value={totals.committed} format={eur} />} hint={`${eur(totals.underVote)} under vote`} />
            </div>
          </div>
        </Section>
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-[1.5fr_1fr]">
        <Reveal>
          <Section title="Latest spending">
            <LedgerHead compact />
            <Stagger>
              {requests.slice(0, 5).map((r) => (
                <StaggerItem key={r.id}>
                  <RequestRow req={r} compact />
                </StaggerItem>
              ))}
            </Stagger>
          </Section>
        </Reveal>

        <Reveal delay={0.1}>
          <Section title="Events">
            <Stagger>
              {events.map((e) => {
                const done = checkedIn(e.id)
                const d = new Date(e.date)
                return (
                  <StaggerItem key={e.id} className="flex items-center gap-4 border-b border-ink/12 py-3.5">
                    <div className="w-12 shrink-0 text-center">
                      <div className="font-mono text-[10px] uppercase text-ink-3">{d.toLocaleDateString('en-GB', { month: 'short' })}</div>
                      <div className="num font-dot text-3xl font-black leading-none">{d.getDate()}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{e.name}</div>
                      <div className="truncate text-xs text-ink-3">
                        {e.location} · {longDate(e.date)}
                      </div>
                      <div className="mt-0.5 font-mono text-[10.5px] text-ink-3">
                        <CountUp value={e.attendees} format={int} /> checked in
                      </div>
                    </div>
                    <AnimatePresence mode="wait" initial={false}>
                      {done ? (
                        <motion.span
                          key="in"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                          className="grid h-9 w-9 place-items-center rounded-full bg-leaf text-white"
                        >
                          <Check size={16} />
                        </motion.span>
                      ) : (
                        <motion.button key="btn" exit={{ scale: 0.8, opacity: 0 }} onClick={() => checkIn(e.id)} className="btn btn-line btn-sm">
                          Check in
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </StaggerItem>
                )
              })}
            </Stagger>
          </Section>
        </Reveal>
      </div>

      <Reveal className="mt-16">
        <Section title="On-chain activity" right={<span className="font-mono text-[11px] text-ink-3">NEAR testnet</span>}>
          <ul>
            <AnimatePresence initial={false}>
              {activity.slice(0, 7).map((a) => (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, backgroundColor: 'rgb(255 90 31 / 0.18)' }}
                  animate={{ opacity: 1, backgroundColor: 'rgb(255 90 31 / 0)' }}
                  transition={{ duration: 1.2, ease: EASE }}
                  className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 border-b border-ink/12 py-3 sm:grid-cols-[110px_minmax(0,1fr)_auto_64px]"
                >
                  <span className="label col-span-2 sm:col-span-1 sm:self-center">{KIND_TAG[a.kind]}</span>
                  <span className="text-sm">{a.text}</span>
                  <TxChip tx={a.tx} className="hidden self-center sm:inline" />
                  <span className="self-center text-right font-mono text-[11px] text-ink-3">{timeAgo(a.at)}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </Section>
      </Reveal>

      <Reveal className="mt-10">
        <p className="font-mono text-[11px] leading-relaxed text-ink-3">
          Rules set by the contract: nobody votes on their own request · nobody approves spending alone · anything over {eur(settings.autoApproveLimit)} needs a committee vote · past records can’t be edited.
        </p>
      </Reveal>
    </>
  )
}
