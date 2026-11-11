'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

const C = 260 // centre of the 520x520 canvas

/** A ring that spins forever, carrying dots around it (votes and passes in transit). */
function Orbit({ r, duration, reverse = false, dots, dashed = false }: { r: number; duration: number; reverse?: boolean; dots: number[]; dashed?: boolean }) {
  return (
    <motion.g
      style={{ transformOrigin: `${C}px ${C}px`, transformBox: 'view-box' }}
      animate={{ rotate: reverse ? -360 : 360 }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
    >
      <circle cx={C} cy={C} r={r} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={1.5} strokeDasharray={dashed ? '4 10' : undefined} />
      {dots.map((deg, i) => {
        const a = (deg * Math.PI) / 180
        return <circle key={i} cx={C + r * Math.cos(a)} cy={C + r * Math.sin(a)} r={i === 0 ? 7 : 4.5} className={i === 0 ? 'fill-accent' : 'fill-current'} fillOpacity={i === 0 ? 1 : 0.55} />
      })}
    </motion.g>
  )
}

/** A short chain of blocks along the bottom, with a pulse travelling from block to block. */
function Chain() {
  const blocks = [70, 150, 230, 310, 390]
  return (
    <g>
      <line x1={70} y1={470} x2={430} y2={470} stroke="currentColor" strokeOpacity={0.25} strokeWidth={2} />
      {blocks.map((x, i) => (
        <motion.rect
          key={x}
          x={x - 16}
          y={454}
          width={32}
          height={32}
          rx={7}
          className="fill-paper"
          stroke="currentColor"
          strokeWidth={2}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 + i * 0.12, type: 'spring', stiffness: 200, damping: 16 }}
        />
      ))}
      <motion.circle
        r={6}
        cy={470}
        className="fill-accent"
        animate={{ cx: [70, 430], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', times: [0, 0.1, 0.9, 1] }}
      />
    </g>
  )
}

/**
 * The hero illustration: the membership pass floating inside orbiting rings,
 * above a little chain of blocks. Decorative only.
 */
export function HeroArt({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      <svg viewBox="0 0 520 520" className="absolute inset-0 h-full w-full text-ink" aria-hidden="true">
        <defs>
          <radialGradient id="hero-glow" cx="50%" cy="45%" r="50%">
            <stop offset="0%" className="[stop-color:var(--color-accent)]" stopOpacity={0.35} />
            <stop offset="100%" className="[stop-color:var(--color-accent)]" stopOpacity={0} />
          </radialGradient>
        </defs>
        <motion.circle cx={C} cy={C - 20} r={210} fill="url(#hero-glow)" animate={{ scale: [1, 1.06, 1] }} style={{ transformOrigin: `${C}px ${C - 20}px`, transformBox: 'view-box' }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
        <Orbit r={232} duration={48} dots={[20, 140, 250]} dashed />
        <Orbit r={180} duration={30} reverse dots={[300, 60]} />
        <Orbit r={128} duration={22} dots={[200]} dashed />
        {/* Sparkles that blink in and out */}
        {[
          [70, 110, 0],
          [450, 90, 1.2],
          [470, 330, 2.1],
          [40, 360, 0.6],
        ].map(([x, y, d], i) => (
          <motion.path
            key={i}
            d={`M${x} ${y - 9}L${x + 2.5} ${y - 2.5}L${x + 9} ${y}L${x + 2.5} ${y + 2.5}L${x} ${y + 9}L${x - 2.5} ${y + 2.5}L${x - 9} ${y}L${x - 2.5} ${y - 2.5}Z`}
            className="fill-accent"
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }}
            style={{ transformOrigin: `${x}px ${y}px`, transformBox: 'view-box' }}
            transition={{ duration: 2.6, repeat: Infinity, delay: d, ease: 'easeInOut' }}
          />
        ))}
        <Chain />
      </svg>
      {/* The pass sits in the middle of the orbits */}
      <div className="absolute inset-x-[14%] top-[22%]">{children}</div>
    </div>
  )
}
