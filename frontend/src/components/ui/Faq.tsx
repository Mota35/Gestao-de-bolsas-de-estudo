import { Minus, Plus } from 'lucide-react'
import { useState } from 'react'

export function FaqItem({ q, a, defaultOpen = true }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-line">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 pb-0 pt-[18px] text-left">
        <span className="text-[15.5px] font-semibold leading-6 text-ink">{q}</span>
        {open ? <Minus size={14} className="shrink-0 text-green" aria-hidden /> : <Plus size={14} className="shrink-0 text-green" aria-hidden />}
      </button>
      {open && <p className="pb-[22px] pt-[9px] text-[14px] leading-[21px] text-muted">{a}</p>}
      {!open && <div className="pb-[18px]" />}
    </div>
  )
}
