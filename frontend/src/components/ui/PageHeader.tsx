import type { ReactNode } from 'react'
import { Fragment } from 'react'
import { Link } from 'react-router-dom'

export function Breadcrumb({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav aria-label="Caminho" className="text-[13px] leading-5 text-muted">
      {items.map((it, i) => (
        <Fragment key={it.label}>
          {i > 0 && ' / '}
          {it.to ? (
            <Link to={it.to} className="hover:underline">
              {it.label}
            </Link>
          ) : (
            <span>{it.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  )
}

export function PageHeader({ crumbs, title, subtitle, bold = false }: { crumbs: Array<{ label: string; to?: string }>; title: ReactNode; subtitle?: ReactNode; bold?: boolean }) {
  return (
    <header className="bg-white">
      <div className="wrap pb-[41px] pt-[40px] max-sm:pb-6 max-sm:pt-6">
        <Breadcrumb items={crumbs} />
        <h1 className={`mt-4 text-[36px] leading-[40px] max-sm:text-[32px] max-sm:leading-[38px] ${bold ? 'display' : 'h-page'}`}>{title}</h1>
        {subtitle && <p className="mt-[1px] text-[17px] leading-6 text-muted max-sm:mt-3">{subtitle}</p>}
      </div>
    </header>
  )
}

export function SectionHead({ eyebrow, title, subtitle, action, bold = false }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; action?: ReactNode; bold?: boolean }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 max-sm:mb-6">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className={`text-[30px] leading-[36px] max-sm:text-[26px] ${bold ? 'display' : 'h-page'}`}>{title}</h2>
        {subtitle && <p className="mt-0.5 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
