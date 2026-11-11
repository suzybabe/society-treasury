import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../env'
import * as schema from './schema'

type Db = ReturnType<typeof drizzle<typeof schema>>

// Reuse one connection pool across hot reloads in development.
const globalForDb = globalThis as unknown as { __treasuryDb?: Db }

function connect(): Db {
  const client = postgres(env.databaseUrl(), { max: 10, prepare: false })
  return drizzle(client, { schema })
}

export function db(): Db {
  globalForDb.__treasuryDb ??= connect()
  return globalForDb.__treasuryDb
}

export { schema }
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
