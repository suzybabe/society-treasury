'use client'

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useMemo } from 'react'
import { rng } from '../lib/chain'
import type { Member } from '../lib/types'

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x + 0.5} y={y + 0.5} width={6} height={6} fill="none" stroke="currentColor" strokeWidth={1} />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="currentColor" />
    </g>
  )
}

function PseudoQR({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    const n = 21
    const r = rng(seed)
    const finder = (x: number, y: number) =>
      [
        [0, 0],
        [n - 7, 0],
        [0, n - 7],
      ].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7)
    const out: [number, number][] = []
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!finder(x, y) && r() > 0.52) out.push([x, y])
    return out
  }, [seed])
  return (
    <svg viewBox="0 0 21 21" className="h-full w-full text-[#111]">
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill="currentColor" />
      ))}
      <Finder x={0} y={0} />
      <Finder x={14} y={0} />
      <Finder x={0} y={14} />
    </svg>
  )
}

/** The membership NFT drawn as a physical card. It tilts toward the cursor on a spring. */
export function MembershipPass({ member, term, shortName }: { member: Member; term: string; shortName: string }) {
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const spring = { stiffness: 180, damping: 18, mass: 0.6 }
  const rotateY = useSpring(useTransform(mx, [0, 1], [-7, 7]), spring)
  const rotateX = useSpring(useTransform(my, [0, 1], [5, -5]), spring)
  const sheenX = useTransform(mx, [0, 1], ['-30%', '130%'])
  const sheen = useMotionTemplate`linear-gradient(105deg, transparent 0%, rgb(255 255 255 / 0) calc(${sheenX} - 18%), rgb(255 255 255 / 0.35) ${sheenX}, rgb(255 255 255 / 0) calc(${sheenX} + 18%), transparent 100%)`

  return (
    // The outer element is the size container, so every cqw unit below
    // (including the card's corner radius) scales with the card's width.
    <div className="@container w-full" style={{ perspective: 1400 }}>
      <motion.div
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          mx.set((e.clientX - r.left) / r.width)
          my.set((e.clientY - r.top) / r.height)
        }}
        onPointerLeave={() => {
          mx.set(0.5)
          my.set(0.5)
        }}
        style={{ rotateX, rotateY }}
        className="relative aspect-[1.586/1] w-full overflow-hidden rounded-[4.5cqw] bg-accent text-on-accent shadow-[0_1px_0_rgb(0_0_0/0.06),0_30px_40px_-28px_rgb(0_0_0/0.55)]"
      >
        <motion.div className="pointer-events-none absolute inset-0 mix-blend-soft-light" style={{ backgroundImage: sheen }} />
        <div className="relative flex h-full flex-col justify-between p-[5.5cqw]">
          <div className="flex items-start justify-between">
            <div>
              <div className="wide text-[length:5cqw] font-extrabold leading-none tracking-tight">{shortName}</div>
              <div className="mt-[1.2cqw] text-[length:2.8cqw] font-medium">Member pass · {term}</div>
            </div>
            <div className="text-right font-mono text-[length:2.4cqw] leading-tight">
              NFT
              <br />
              NEAR
            </div>
          </div>

          <div className="flex items-end justify-between gap-[4cqw]">
            <div className="min-w-0">
              <div className="num font-dot text-[length:17cqw] font-black leading-[0.8] tracking-tight">{String(member.passId).padStart(4, '0')}</div>
              <div className="mt-[3cqw] truncate text-[length:4.4cqw] font-semibold leading-none">{member.name}</div>
              <div className="mt-[1.4cqw] truncate font-mono text-[length:2.5cqw]">{member.near}</div>
            </div>
            <div className="aspect-square w-[22cqw] shrink-0 rounded-[1.5cqw] bg-white p-[1.6cqw]">
              <PseudoQR seed={member.near} />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
