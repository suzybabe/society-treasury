import 'server-only'
import { Account, actions, type KeyPairString } from 'near-api-js'
import { env } from './env'

/** 50 Tgas covers every method in the treasury contract with room to spare. */
const GAS = BigInt(50_000_000_000_000)

export type ContractCallResult =
  | { ok: true; txHash: string; value: unknown }
  /** The contract rejected the call (a rule failed). Retrying won't help. */
  | { ok: false; permanent: true; txHash: string | null; error: string }
  /** Network or RPC trouble. Safe to retry later. */
  | { ok: false; permanent: false; txHash: null; error: string }

export const nearConfigured = () => !!env.nearContractId() && !!env.nearRecorderKey()

let cached: { account: Account; contractId: string } | null = null

function recorder() {
  const contractId = env.nearContractId()
  const key = env.nearRecorderKey()
  if (!contractId || !key) throw new Error('NEAR contract is not configured')
  // The key is a function-call key on the contract account itself, so the
  // contract account signs and pays for every call. Members never pay gas.
  cached ??= { account: new Account(contractId, env.nearRpcUrl(), key as KeyPairString), contractId }
  return cached
}

/** Extracts the readable reason from a failed execution, e.g. a contract panic message. */
function failureReason(failure: unknown): string {
  const text = JSON.stringify(failure)
  const panic = /Smart contract panicked: ([^"\\]+)/.exec(text)
  return panic ? panic[1] : text.slice(0, 500)
}

/** Calls a change method on the treasury contract, signed (and paid for) by the contract account. */
export async function callContract(method: string, args: Record<string, unknown>): Promise<ContractCallResult> {
  const { account, contractId } = recorder()
  try {
    const res = await account.signAndSendTransaction({
      receiverId: contractId,
      actions: [actions.functionCall(method, args, GAS, BigInt(0))],
      waitUntil: 'FINAL',
      throwOnFailure: false,
    })
    const txHash = res.transaction.hash
    const status = res.status as Record<string, unknown> | string
    if (typeof status === 'object' && status && 'Failure' in status) {
      return { ok: false, permanent: true, txHash, error: failureReason(status.Failure) }
    }
    const raw = typeof status === 'object' && status && typeof status.SuccessValue === 'string' ? status.SuccessValue : ''
    const decoded = raw ? Buffer.from(raw, 'base64').toString('utf8') : ''
    let value: unknown = null
    try {
      value = decoded ? JSON.parse(decoded) : null
    } catch {
      value = decoded
    }
    return { ok: true, txHash, value }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // An execution error thrown by the RPC is still the contract saying no.
    if (/Smart contract panicked|FunctionCallError|ExecutionError/.test(message)) {
      return { ok: false, permanent: true, txHash: null, error: failureReason(message) }
    }
    return { ok: false, permanent: false, txHash: null, error: message.slice(0, 500) }
  }
}
