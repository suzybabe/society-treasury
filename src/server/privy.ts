import 'server-only'
import { PrivyClient } from '@privy-io/node'
import { unstable_rethrow } from 'next/navigation'
import { env } from './env'
import { ApiError } from './http'

const globalForPrivy = globalThis as unknown as { __privy?: PrivyClient }

function privy(): PrivyClient {
  globalForPrivy.__privy ??= new PrivyClient({ appId: env.privyAppId(), appSecret: env.privyAppSecret() })
  return globalForPrivy.__privy
}

/** Verifies the Privy access token in the Authorization header and returns the Privy user id. */
export async function verifyRequest(req: Request): Promise<string> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new ApiError(401, 'Please sign in.')
  // Created outside the try, so missing keys surface as a server error, not "session expired".
  const auth = privy().utils().auth()
  try {
    const { user_id } = await auth.verifyAccessToken(token)
    return user_id
  } catch (err) {
    unstable_rethrow(err)
    throw new ApiError(401, 'Your session has expired. Please sign in again.')
  }
}

/**
 * Reads the user's verified email and NEAR wallet from Privy, so the server
 * never has to trust these values from the browser.
 */
export async function getPrivyProfile(privyUserId: string): Promise<{ email: string; nearAccountId: string | null }> {
  const user = await privy().users()._get(privyUserId)
  let email: string | null = null
  let nearAccountId: string | null = null
  for (const account of user.linked_accounts) {
    if (account.type === 'email') email = account.address.toLowerCase()
    if (account.type === 'wallet' && 'chain_type' in account && account.chain_type === 'near') nearAccountId = account.address
  }
  if (!email) throw new ApiError(400, 'Your account has no verified email address.')
  return { email, nearAccountId }
}
