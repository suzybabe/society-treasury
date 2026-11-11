'use client'

import { animate, motion, type Variants } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

export const EASE = [0.16, 1, 0.3, 1] as const

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({ children, delay = 0, className, onLoad = false }: { children: ReactNode; delay?: number; className?: string; onLoad?: boolean }) {
  const shown = { opacity: 1, y: 0 }
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      {...(onLoad ? { animate: shown } : { whileInView: shown, viewport: { once: true, margin: '-40px' } })}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

const listVariants: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={listVariants} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-20px' }}>
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={itemVariants} layout="position">
      {children}
    </motion.div>
  )
}

/**
 * Animates a number from its previous value to the new one. The animation
 * writes straight to the DOM; React only renders the starting text once.
 */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const current = useRef(0)
  const [initial] = useState(() => format(0))
  useEffect(() => {
    const controls = animate(current.current, value, {
      duration: 1.2,
      ease: EASE,
      onUpdate: (v) => {
        current.current = v
        if (ref.current) ref.current.textContent = format(v)
      },
    })
    return () => controls.stop()
  }, [value, format])
  return <span ref={ref}>{initial}</span>
}

export const int = (n: number) => String(Math.round(n))

/** Slides each word up from behind a mask, one after another. */
export function WordsUp({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '105%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: delay + i * 0.07 }}
          >
            {w}
            {' '}
          </motion.span>
        </span>
      ))}
    </span>
  )
}
