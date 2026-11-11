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
  /** The first person to sign up with this email becomes president. */
  bootstrapPresidentEmail: () => process.env.BOOTSTRAP_PRESIDENT_EMAIL?.trim().toLowerCase() || null,
}
