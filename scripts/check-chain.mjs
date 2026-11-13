// Reads the live Society Treasury contract on NEAR testnet and prints what it holds.
// No keys, wallet or install needed: `node scripts/check-chain.mjs` (Node 18 or newer).
// Set CONTRACT or RPC to read another deployment.

const CONTRACT = process.env.CONTRACT || 'society-treasury.testnet'
const RPC = process.env.RPC || 'https://test.rpc.fastnear.com'

async function rpc(params) {
  for (let tries = 1; ; tries++) {
    try {
      const res = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params }) })
      const body = await res.json()
      if (body.error) throw new Error(body.error.data ?? body.error.message)
      return body.result
    } catch (err) {
      if (tries === 4) throw err
      await new Promise((r) => setTimeout(r, 800 * tries))
    }
  }
}

const view = async (method, args = {}) => {
  const result = await rpc({ request_type: 'call_function', finality: 'final', account_id: CONTRACT, method_name: method, args_base64: Buffer.from(JSON.stringify(args)).toString('base64') })
  return JSON.parse(Buffer.from(result.result).toString())
}

const short = (id) => (id.length > 24 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id)
const eur = (cents) => `€${(cents / 100).toFixed(2)}`

const [society, settings, stats, quorum, roles, passes, requests, keys] = await Promise.all([
  view('get_society'),
  view('get_settings'),
  view('get_stats'),
  view('get_student_quorum'),
  view('get_roles'),
  view('get_passes', { from_index: 0, limit: 100 }),
  view('get_requests', { from_index: 0, limit: 100 }),
  rpc({ request_type: 'view_access_key_list', finality: 'final', account_id: CONTRACT }),
])

console.log(`Society Treasury on NEAR testnet: ${CONTRACT}`)
console.log(`  ${society.name} (${society.short_name}), term ${society.term}`)
console.log(`  rules: pass with more than ${settings.approval_percent}% of votes, at least 2 yes; student vote counts after ${quorum} students vote`)
console.log(`  ${stats.passes} passes, ${stats.requests} spending requests, ${eur(stats.spent_cents)} marked spent`)

console.log('Committee roles')
for (const [account, role] of roles) console.log(`  ${role.padEnd(10)} ${short(account)}`)

console.log('Membership passes (non-transferable NFTs)')
for (const p of passes) console.log(`  #${String(p.number).padStart(4, '0')}  ${short(p.owner)}  ${p.term}  fee ${eur(p.fee_cents)} by ${p.fee_method}`)

console.log('Spending requests')
for (const r of requests.slice(-5)) {
  const yes = r.votes.filter((v) => v.approve).length
  console.log(`  ${r.app_ref.padEnd(9)} ${r.title}: ${eur(r.amount_cents)}, ${r.status}, ${yes} yes / ${r.votes.length - yes} no${r.receipt ? `, receipt sha256 ${r.receipt.sha256.slice(0, 12)}…` : ''}`)
}

console.log('Access keys on the contract account')
for (const k of keys.keys) {
  const p = k.access_key.permission
  if (p === 'FullAccess') console.log('  full access (the owner’s key, which is not on the server)')
  else console.log(`  function call only: ${p.FunctionCall.method_names.join(', ')}`)
}
