import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

type Props = { variant?: 'header' | 'side' | 'footer'; to?: string }

export function Logo({ variant = 'header', to = '/' }: Props) {
  if (variant === 'footer') {
    return (
      <div className="flex items-center gap-2 text-white">
        <ArrowUpRight size={20} strokeWidth={2.6} aria-hidden />
        <span className="text-[24px] font-bold leading-none tracking-tight">kwanza oportunidades</span>
      </div>
    )
  }
  const side = variant === 'side'
  return (
    <Link to={to} aria-label="Kwanza Oportunidades — início" className="inline-flex flex-col leading-none">
      <span className="flex items-center gap-[7px]">
        <ArrowUpRight size={side ? 15 : 18} strokeWidth={3} className="text-green" aria-hidden />
        <span className={`font-bold tracking-tight ${side ? 'text-[21px] text-white' : 'text-[24px] text-navy'}`}>kwanza</span>
      </span>
      <span className={`mt-[1px] font-normal uppercase tracking-[0.04em] ${side ? 'ml-[10px] text-[9px] text-[#b9cdd5]' : 'ml-[9px] text-[9px] text-muted'}`}>Oportunidades</span>
    </Link>
  )
}
