import { forwardRef, useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { AlertCircle, Inbox, Loader2 } from 'lucide-react'
import type { FieldError } from 'react-hook-form'

export function Spinner({ label = 'A carregar…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 py-10 text-center">
      <AlertCircle className="h-8 w-8 text-red-500" aria-hidden />
      <p className="text-slate-700">{message}</p>
      {onRetry && (
        <button type="button" className="btn-outline" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-12 text-center">
      <Inbox className="h-8 w-8 text-slate-400" aria-hidden />
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      {text && <p className="max-w-md text-sm text-slate-500">{text}</p>}
      {action}
    </div>
  )
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-brand-700 sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
    </div>
  )
}

export function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'gray' | 'green' | 'amber' | 'red' | 'blue' }) {
  const tones = {
    gray: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-brand-100 text-brand-700',
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

export function DemoBadge() {
  return <Badge tone="amber">Dados de demonstração</Badge>
}

interface FieldProps {
  label: string
  error?: FieldError | { message?: string }
  hint?: string
}

export const TextField = forwardRef<HTMLInputElement, FieldProps & InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ label, error, hint, className, ...rest }, ref) {
    const id = useId()
    return (
      <div className={className}>
        <label htmlFor={id} className="label">{label}</label>
        <input
          id={id}
          ref={ref}
          className="input"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          {...rest}
        />
        {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>}
        {error && <p id={`${id}-err`} className="field-error" role="alert">{error.message}</p>}
      </div>
    )
  },
)

export const TextAreaField = forwardRef<HTMLTextAreaElement, FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextAreaField({ label, error, hint, className, ...rest }, ref) {
    const id = useId()
    return (
      <div className={className}>
        <label htmlFor={id} className="label">{label}</label>
        <textarea
          id={id}
          ref={ref}
          rows={4}
          className="input"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          {...rest}
        />
        {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        {error && <p id={`${id}-err`} className="field-error" role="alert">{error.message}</p>}
      </div>
    )
  },
)

export const SelectField = forwardRef<HTMLSelectElement, FieldProps & SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectField({ label, error, hint, className, children, ...rest }, ref) {
    const id = useId()
    return (
      <div className={className}>
        <label htmlFor={id} className="label">{label}</label>
        <select id={id} ref={ref} className="input" aria-invalid={!!error} {...rest}>
          {children}
        </select>
        {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        {error && <p className="field-error" role="alert">{error.message}</p>}
      </div>
    )
  },
)

export function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  return (
    <nav aria-label="Paginação" className="mt-6 flex items-center justify-center gap-3">
      <button type="button" className="btn-outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      <span className="text-sm text-slate-600">
        Página {page} de {pages}
      </span>
      <button type="button" className="btn-outline" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Seguinte
      </button>
    </nav>
  )
}

/** Diálogo de confirmação acessível, usado antes de acções destrutivas. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = true,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      className="w-full max-w-md rounded-xl p-0 shadow-xl backdrop:bg-black/40"
      aria-labelledby="confirm-title"
    >
      <div className="p-6">
        <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onCancel}>Cancelar</button>
          <button type="button" className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  )
}
