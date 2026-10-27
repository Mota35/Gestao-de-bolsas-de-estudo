import { useEffect, useRef, type ReactNode } from 'react'

/** Confirmação antes de acções destrutivas. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel?: string
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
    <dialog ref={ref} onCancel={onCancel} className="m-auto w-[min(440px,calc(100%-32px))] rounded-2xl border border-line p-6 shadow-xl backdrop:bg-navy/40">
      <h2 className="text-[20px] font-semibold">{title}</h2>
      {children && <p className="mt-2 text-[14px] text-muted">{children}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className="btn btn-sm" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn btn-sm btn-primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
