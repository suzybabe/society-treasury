// Mock chain helpers. These stand in for real NEAR transactions until the
// contract is deployed. They are deterministic so the same seed always gives
// the same hash.

function hashStr(s: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function rng(seed: string) {
  let a = hashStr(seed)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function txHash(seed: string) {
  const r = rng(seed)
  return Array.from({ length: 44 }, () => B58[Math.floor(r() * 58)]).join('')
}

export const freshTx = (kind: string) => txHash(`${kind}-${Date.now()}-${Math.random()}`)

export const shortHash = (h: string) => `${h.slice(0, 6)}…${h.slice(-4)}`

export const blockOf = (tx: string) => 182_400_000 + Math.floor(rng(tx)() * 900_000)
