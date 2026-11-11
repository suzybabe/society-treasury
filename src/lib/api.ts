// Browser-side helper for calling our API with the Privy access token.

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export interface ApiInit {
  method?: 'GET' | 'POST' | 'PATCH'
  json?: unknown
  form?: FormData
}

export async function apiRaw(path: string, token: string | null, init: ApiInit = {}): Promise<Response> {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (init.json !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(path, {
    method: init.method ?? (init.json !== undefined || init.form ? 'POST' : 'GET'),
    headers,
    body: init.form ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ApiRequestError(res.status, data?.error ?? `Request failed (${res.status})`)
  }
  return res
}

export async function apiJson<T>(path: string, token: string | null, init?: ApiInit): Promise<T> {
  return (await apiRaw(path, token, init)).json() as Promise<T>
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong. Please try again.')
