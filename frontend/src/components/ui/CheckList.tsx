import { Check } from 'lucide-react'

export function CheckList({ items, className = '', size = 14.5 }: { items: string[]; className?: string; size?: number }) {
  return (
    <ul className={`space-y-[6px] ${className}`}>
      {items.map((i) => (
        <li key={i} className="flex items-start gap-[10px] leading-[21px]" style={{ fontSize: size }}>
          <Check size={14} className="mt-[4px] shrink-0 text-ink" aria-hidden /> {i}
        </li>
      ))}
    </ul>
  )
}
