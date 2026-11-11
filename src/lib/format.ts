const eurFmt = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })

export const eur = (n: number) => eurFmt.format(n)

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

export const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return shortDate(iso)
}

export const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export const passNo = (n: number) => `#${String(n).padStart(4, '0')}`

export const daysAgo = (d: number, h = 0) => new Date(Date.now() - (d * 24 + h) * 3600_000).toISOString()

export const daysFromNow = (d: number, hour = 18) => {
  const t = new Date(Date.now() + d * 24 * 3600_000)
  t.setHours(hour, 0, 0, 0)
  return t.toISOString()
}
