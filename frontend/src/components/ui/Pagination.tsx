import { env } from '../../lib/env'

export function Pagination({ page, total, pageSize, onChange, label }: { page: number; total: number; pageSize: number; onChange: (p: number) => void; label?: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <nav aria-label="Paginação" className="mt-5 flex flex-wrap items-center justify-between gap-4">
      <p className="small">{label ?? `${from}–${to} de ${total} ${env.demoMode ? 'exemplos' : 'resultados'}`}</p>
      <div className="flex items-center gap-2.5">
        <button type="button" className="page-btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Anterior
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button key={p} type="button" className="page-btn max-sm:hidden" aria-current={p === page ? 'page' : undefined} aria-label={`Página ${p}`} onClick={() => onChange(p)}>
            {p}
          </button>
        ))}
        <button type="button" className="page-btn max-sm:!bg-green max-sm:!text-white" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Seguinte
        </button>
      </div>
    </nav>
  )
}
