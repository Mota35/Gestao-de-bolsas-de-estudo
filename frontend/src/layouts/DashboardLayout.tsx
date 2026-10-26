import { Link, NavLink, Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'

export interface DashNavItem {
  to: string
  label: string
  end?: boolean
  icon?: ReactNode
}

export function DashboardLayout({ title, items }: { title: string; items: DashNavItem[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside aria-label={title}>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-200'}`
              }
            >
              {i.label}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="mt-4 block text-sm text-brand-600 hover:underline">← Voltar ao site</Link>
      </aside>
      <section>
        <Outlet />
      </section>
    </div>
  )
}
