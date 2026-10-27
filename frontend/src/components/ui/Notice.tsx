import type { ReactNode } from 'react'

type Tone = 'info' | 'success' | 'warn' | 'error'

export function Notice({ tone = 'info', title, children, className = '' }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  return (
    <div className={`notice notice-${tone} ${className}`} role={tone === 'error' ? 'alert' : undefined}>
      {title && <span className="notice-title">{title}</span>}
      {children}
    </div>
  )
}

type DotTone = 'green' | 'amber' | 'red' | 'gray'
export function Dot({ tone = 'gray', children, className = '' }: { tone?: DotTone; children: ReactNode; className?: string }) {
  return <span className={`dot-label tone-${tone} ${className}`}>{children}</span>
}
