import { Loader2, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'

export function Loading({ label = 'A carregar…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-muted">
      <Loader2 className="animate-spin" size={18} aria-hidden />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="notice notice-error flex flex-wrap items-center justify-between gap-3">
      <span>
        <strong className="notice-title">Não foi possível carregar</strong>
        {message}
      </span>
      {onRetry && (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="card px-6 py-16 text-center max-sm:py-10">
      <SearchX size={46} strokeWidth={1.4} className="mx-auto text-green" aria-hidden />
      <h2 className="display mx-auto mt-6 text-[28px] leading-9">{title}</h2>
      {children && <p className="lead mx-auto mt-4 max-w-[930px] text-[17px] leading-6">{children}</p>}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  )
}
