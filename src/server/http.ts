import 'server-only'
import { unstable_rethrow } from 'next/navigation'
import { ZodError } from 'zod'

/** An error that is safe to show to the user, with an HTTP status. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Wraps a route handler so thrown errors become JSON responses. */
export function route<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args)
    } catch (err) {
      // Let Next.js handle its own control-flow errors (e.g. prerender bail-outs).
      unstable_rethrow(err)
      if (err instanceof ApiError) return Response.json({ error: err.message }, { status: err.status })
      if (err instanceof ZodError) {
        const first = err.issues[0]
        return Response.json({ error: first ? `${first.path.join('.') || 'input'}: ${first.message}` : 'Invalid input' }, { status: 400 })
      }
      console.error(err)
      return Response.json({ error: 'Something went wrong on our side. Please try again.' }, { status: 500 })
    }
  }
}

export const ok = (data: unknown = { ok: true }, status = 200) => Response.json(data, { status })

export async function body(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new ApiError(400, 'Request body must be JSON.')
  }
}

export const toCents = (euros: number) => Math.round(euros * 100)
export const toEuros = (cents: number) => cents / 100
