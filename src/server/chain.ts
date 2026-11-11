import 'server-only'
import { and, asc, eq } from 'drizzle-orm'
import { after } from 'next/server'
import { db, schema, type Tx } from './db'
import type { ChainTarget } from './db/schema'
import { callContract, nearConfigured } from './near'

const { chainJobs, members, spendRequests, votes, receipts, activity } = schema

/** Give up on a job after this many network failures (contract rejections fail at once). */
const MAX_ATTEMPTS = 8

/**
 * Queues a contract call in the same database transaction as the record it
 * mirrors. The member is passed as `on_behalf_of`; the contract account signs
 * and pays the gas. Skipped when the acting member has no NEAR account.
 */
export async function enqueueChain(
  tx: Tx,
  job: {
    method: string
    args: Record<string, unknown>
    /** The member acting. Use `system: true` instead for calls the app makes itself (e.g. add_president). */
    onBehalfOf: string | null
    system?: boolean
    target?: ChainTarget
    activityId?: number | null
  },
) {
  if (!job.onBehalfOf && !job.system) return
  await tx.insert(chainJobs).values({
    method: job.method,
    args: job.system ? job.args : { ...job.args, on_behalf_of: job.onBehalfOf },
    target: job.target ?? { kind: 'none' },
    activityId: job.activityId ?? null,
  })
}

/** Sends queued jobs to NEAR after the current response has been sent. */
export function syncChainSoon() {
  after(() => processChainJobs().catch((err) => console.error('chain sync failed', err)))
}

let running = false

/**
 * Sends pending jobs to NEAR one at a time, oldest first, so a vote never
 * lands before its request. Network errors stop the run and are retried
 * later (keeping the order); contract rejections are recorded and skipped.
 * One Railway instance runs this, so an in-process guard is enough.
 */
export async function processChainJobs(): Promise<void> {
  if (running || !nearConfigured()) return
  running = true
  try {
    for (;;) {
      const job = await db().query.chainJobs.findFirst({ where: eq(chainJobs.status, 'pending'), orderBy: asc(chainJobs.id) })
      if (!job) return

      // Votes and receipts need the request's id in the contract.
      const args = { ...job.args }
      if (job.target.kind === 'vote' || job.target.kind === 'receipt') {
        const request = await db().query.spendRequests.findFirst({ where: eq(spendRequests.id, job.target.requestId), columns: { chainId: true } })
        if (request?.chainId == null) {
          await markFailed(job.id, null, 'The request was never recorded on NEAR')
          continue
        }
        args.request_id = request.chainId
      }

      const result = await callContract(job.method, args)
      if (result.ok) {
        await db().transaction(async (tx) => {
          await tx.update(chainJobs).set({ status: 'done', txHash: result.txHash, error: null, doneAt: new Date(), attempts: job.attempts + 1 }).where(eq(chainJobs.id, job.id))
          await applyTarget(tx, job.target, result.txHash, result.value)
          if (job.activityId) await tx.update(activity).set({ txHash: result.txHash }).where(eq(activity.id, job.activityId))
        })
      } else if (result.permanent || job.attempts + 1 >= MAX_ATTEMPTS) {
        console.error(`chain job ${job.id} (${job.method}) failed: ${result.error}`)
        await markFailed(job.id, result.txHash, result.error)
      } else {
        // Temporary trouble: keep the job and stop here so later jobs stay in order.
        await db().update(chainJobs).set({ attempts: job.attempts + 1, error: result.error }).where(eq(chainJobs.id, job.id))
        return
      }
    }
  } finally {
    running = false
  }
}

async function markFailed(id: number, txHash: string | null, error: string) {
  await db().update(chainJobs).set({ status: 'failed', txHash, error, doneAt: new Date() }).where(eq(chainJobs.id, id))
}

async function applyTarget(tx: Tx, target: ChainTarget, txHash: string, value: unknown) {
  switch (target.kind) {
    case 'pass':
      await tx.update(members).set({ passTxHash: txHash }).where(eq(members.id, target.memberId))
      break
    case 'request':
      await tx
        .update(spendRequests)
        .set({ txHash, chainId: typeof value === 'number' ? value : null })
        .where(eq(spendRequests.id, target.requestId))
      break
    case 'vote':
      await tx.update(votes).set({ txHash }).where(and(eq(votes.requestId, target.requestId), eq(votes.memberId, target.memberId)))
      break
    case 'receipt':
      await tx.update(receipts).set({ txHash }).where(eq(receipts.requestId, target.requestId))
      break
    case 'none':
      break
  }
}
