import 'server-only'

// Read lazily so `next build` works without secrets; a missing value fails
// the first request that needs it, with a message saying what to set.
function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`)
  return value
}

export const env = {
  databaseUrl: () => required('DATABASE_URL'),
  privyAppId: () => required('NEXT_PUBLIC_PRIVY_APP_ID'),
  privyAppSecret: () => required('PRIVY_APP_SECRET'),
  /**
   * NEAR contract settings. When the contract ID or key is missing, chain jobs
   * stay queued (nothing is lost) until they're configured.
   */
  nearContractId: () => process.env.NEAR_CONTRACT_ID || process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID || null,
  nearRpcUrl: () => process.env.NEAR_RPC_URL || 'https://test.rpc.fastnear.com',
  /** Function-call access key on the contract account; it pays the gas. */
  nearRecorderKey: () => process.env.NEAR_RECORDER_PRIVATE_KEY || null,
  /** The first person to sign up with this email becomes president. */
  /**
   * Comma-separated. Each person listed becomes a (co-)president when they
   * sign up, or on their next sign-in if they already have an account.
   */
  presidentEmails: (): string[] =>
    (process.env.BOOTSTRAP_PRESIDENT_EMAIL ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
}
