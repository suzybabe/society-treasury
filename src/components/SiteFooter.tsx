/** Footer with the college and department, used on every page. */
export function SiteFooter({ societyName, compact = false }: { societyName?: string; compact?: boolean }) {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-ink/12">
      <div className={`mx-auto flex max-w-6xl flex-col gap-4 px-5 sm:flex-row sm:items-end sm:justify-between lg:px-10 ${compact ? 'py-6' : 'py-10'}`}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink font-dot text-sm font-black text-paper">GCD</span>
          <div>
            <div className="wide font-bold leading-tight">Griffith College Dublin</div>
            <div className="text-sm text-ink-2">Department of Computer Science</div>
          </div>
        </div>
        <div className="font-mono text-[11px] leading-relaxed text-ink-3 sm:text-right">
          {societyName ? `${societyName} treasury` : 'Society treasury'} · records on NEAR
          <br />© {year} · Past records can’t be edited or deleted.
        </div>
      </div>
    </footer>
  )
}
