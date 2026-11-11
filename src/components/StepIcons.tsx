'use client'

import { motion, type Transition } from 'motion/react'

export type StepIconKind = 'signup' | 'pay' | 'pass' | 'request' | 'vote' | 'check'

const loop = (duration: number, delay = 0): Transition => ({ duration, repeat: Infinity, ease: 'easeInOut', delay, repeatDelay: 0.6 })

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** Small looping vector animations for each "How it works" step. Decorative only. */
export function StepIcon({ kind }: { kind: StepIconKind }) {
  return (
    <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden="true">
      {kind === 'signup' && (
        <>
          <rect x={7} y={14} width={34} height={24} rx={4} {...stroke} />
          <motion.path d="M8 16l16 12 16-12" {...stroke} animate={{ pathLength: [0, 1, 1] }} transition={loop(2.4)} />
          {/* The 6-digit code flying out */}
          <motion.circle cx={24} cy={10} r={3.2} className="fill-accent" animate={{ y: [8, -2, -2], opacity: [0, 1, 0] }} transition={loop(2.4, 0.6)} />
        </>
      )}
      {kind === 'pay' && (
        <>
          <path d="M10 34h28" {...stroke} />
          <path d="M14 34v6h20v-6" {...stroke} />
          <motion.g animate={{ y: [-14, 6, 6], opacity: [0, 1, 0] }} transition={loop(2)}>
            <circle cx={24} cy={20} r={8} className="fill-accent" />
            <path d="M26.5 17a4 4 0 1 0 0 6M19.5 19.2h5M19.5 21h5" fill="none" stroke="var(--color-on-accent)" strokeWidth={1.6} strokeLinecap="round" />
          </motion.g>
        </>
      )}
      {kind === 'pass' && (
        <>
          <defs>
            <clipPath id="pass-clip">
              <rect x={6} y={12} width={36} height={24} rx={4} />
            </clipPath>
          </defs>
          <rect x={6} y={12} width={36} height={24} rx={4} className="fill-accent" />
          <path d="M12 29h12M12 24h8" fill="none" stroke="var(--color-on-accent)" strokeWidth={2.4} strokeLinecap="round" />
          <rect x={30} y={20} width={7} height={7} rx={1.5} fill="var(--color-on-accent)" />
          <g clipPath="url(#pass-clip)">
            <motion.rect y={8} width={8} height={32} fill="white" fillOpacity={0.45} transform="skewX(-20)" animate={{ x: [0, 64] }} transition={loop(2.2)} />
          </g>
        </>
      )}
      {kind === 'request' && (
        <>
          <path d="M14 6h14l8 8v28H14z" {...stroke} />
          <path d="M28 6v8h8" {...stroke} />
          {[22, 28, 34].map((y, i) => (
            <motion.path key={y} d={`M19 ${y}h${i === 2 ? 8 : 12}`} {...stroke} stroke="var(--color-accent)" animate={{ pathLength: [0, 1, 1] }} transition={loop(2.4, i * 0.3)} />
          ))}
        </>
      )}
      {kind === 'vote' && (
        <>
          <rect x={8} y={8} width={32} height={32} rx={8} {...stroke} />
          <motion.path d="M16 25l6 6 11-13" fill="none" stroke="var(--color-accent)" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" animate={{ pathLength: [0, 1, 1] }} transition={loop(1.8)} />
        </>
      )}
      {kind === 'check' && (
        <>
          {[14, 22, 30].map((y) => (
            <path key={y} d={`M8 ${y}h22`} {...stroke} strokeOpacity={0.45} />
          ))}
          <motion.g animate={{ x: [0, 10, 0], y: [0, 8, 0] }} transition={loop(3)}>
            <circle cx={26} cy={20} r={8} {...stroke} stroke="var(--color-accent)" />
            <path d="M32 26l7 7" {...stroke} stroke="var(--color-accent)" />
          </motion.g>
        </>
      )}
    </svg>
  )
}
