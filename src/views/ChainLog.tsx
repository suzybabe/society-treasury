'use client'

import { ExternalLink } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { EASE, Reveal } from '../components/motion'
import { ChainChip, Empty, Figure, PageHeader, Section } from '../components/ui'
import { dateTime, timeAgo } from '../lib/format'
import { explorerAccount } from '../lib/near'
import { useTreasury } from '../state/store'

/**
 * Every contract transaction the app has made, newest first, each linking to
 * NearBlocks. Anyone with a pass can audit the whole on-chain record here.
 */
export default function ChainLog() {
  const { chainLog, contractId } = useTreasury()
  const done = chainLog.filter((e) => e.status === 'done').length
  const pending = chainLog.filter((e) => e.status === 'pending').length
  const failed = chainLog.filter((e) => e.status === 'failed').length

  return (
    <>
      <PageHeader
        eyebrow="On-chain record"
        title="On NEAR"
        sub="Every pass, vote, request and receipt the treasury records on the NEAR blockchain. Each one links to the transaction, so anyone can check it."
        actions={
          contractId && (
            <a href={explorerAccount(contractId)} target="_blank" rel="noreferrer" className="btn btn-line">
              <ExternalLink size={16} /> Contract on NEAR
            </a>
          )
        }
      />

      <Reveal>
        <div className="grid grid-cols-3 border-b border-ink/12">
          <Figure label="Recorded" value={done} />
          <div className="border-l border-ink/12 pl-5">
            <Figure label="On the way" value={pending} />
          </div>
          <div className="border-l border-ink/12 pl-5">
            <Figure label="Not recorded" value={failed} />
          </div>
        </div>
      </Reveal>

      <Reveal className="mt-10">
        <Section title="Transactions" right={contractId && <span className="font-mono text-xs text-ink-3">{contractId}</span>}>
          {chainLog.length === 0 && <Empty title="No transactions yet" sub="Passes, requests, votes and receipts appear here as soon as they're recorded on NEAR." />}
          <ul>
            <AnimatePresence initial={false}>
              {chainLog.map((e, i) => (
                <motion.li
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: Math.min(i, 10) * 0.03 }}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-ink/12 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto_90px]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{e.label}</div>
                    <div className="truncate font-mono text-[11px] text-ink-3" title={e.error}>
                      #{e.id} · {e.method}
                      {e.status === 'failed' && e.error ? ` · ${e.error}` : ''}
                    </div>
                  </div>
                  <ChainChip chain={{ status: e.status, tx: e.tx, error: e.error }} className="justify-self-end" />
                  <span className="col-span-2 font-mono text-[11px] text-ink-3 sm:col-span-1 sm:text-right" title={dateTime(e.at)}>
                    {timeAgo(e.at)}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </Section>
      </Reveal>

      <p className="mt-8 max-w-2xl text-sm text-ink-3">
        The treasury app sends each record to the contract on behalf of the member who acted, and pays the network fee, so members never need NEAR. The contract still checks every rule against that member.
      </p>
    </>
  )
}
