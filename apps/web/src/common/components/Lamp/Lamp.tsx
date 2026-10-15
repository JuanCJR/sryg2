import { Lock, X, Clock, Check } from 'lucide-react'
import clsx from '../../utils/clsx'
import styles from './Lamp.module.css'

// 'sin-datos' (no icon, unknown yet) must never reuse 'activa' — that would misread as confirmed-ok.
export type LampStatus = 'bloqueada' | 'vencida' | 'proxima' | 'activa' | 'sin-datos'
export type LampSize = 'sm' | 'md' | 'lg'

const GLYPH: Partial<Record<LampStatus, typeof Lock>> = {
  bloqueada: Lock,
  vencida: X,
  proxima: Clock,
  activa: Check,
  // sin-datos intentionally has no glyph — outline only.
}

const ICON_PX: Record<LampSize, number> = {
  sm: 10,
  md: 14,
  lg: 20,
}

export interface LampProps {
  status: LampStatus
  size?: LampSize
  className?: string
}

export function Lamp({ status, size = 'md', className }: LampProps) {
  const Glyph = GLYPH[status]
  return (
    <span className={clsx(styles.lamp, styles[size], styles[status], className)} aria-hidden="true">
      {Glyph ? <Glyph size={ICON_PX[size]} strokeWidth={2} /> : null}
    </span>
  )
}
