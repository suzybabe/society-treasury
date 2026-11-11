// Runs once when the server starts. Retries queued NEAR transactions every
// 30 seconds, so a network hiccup or restart never loses an on-chain record.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  // Never start timers during `next build`, or the build would never exit.
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  const { processChainJobs } = await import('./server/chain')
  const tick = () => processChainJobs().catch((err) => console.error('chain sync failed', err))
  setTimeout(tick, 5_000)
  setInterval(tick, 30_000)
}
