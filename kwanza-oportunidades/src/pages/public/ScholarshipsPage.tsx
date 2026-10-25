import { useSearchParams } from 'react-router-dom'
import { scholarshipService } from '../../services/scholarships'
import { useAsync } from '../../hooks/useAsync'
import type { ScholarshipFilters } from '../../types'
import { ScholarshipCard } from '../../components/ScholarshipCard'
import { EmptyState, ErrorState, PageHeader, Pagination, Spinner } from '../../components/ui'

const PAGE_SIZE = 12

export default function ScholarshipsPage() {
  const [params, setParams] = useSearchParams()
  const filters: ScholarshipFilters = {
    q: params.get('q') ?? '',
    country: params.get('country') ?? '',
    level: (params.get('level') ?? '') as ScholarshipFilters['level'],
    field: params.get('field') ?? '',
    funding: (params.get('funding') ?? '') as ScholarshipFilters['funding'],
    modality: (params.get('modality') ?? '') as ScholarshipFilters['modality'],
    status: (params.get('status') ?? '') as ScholarshipFilters['status'],
    deadlineBefore: params.get('deadlineBefore') ?? '',
    sort: (params.get('sort') ?? 'relevance') as ScholarshipFilters['sort'],
    page: Number(params.get('page') ?? 1) || 1,
  }

  const { data, loading, error, reload } = useAsync(
    () => scholarshipService.list({ ...filters, pageSize: PAGE_SIZE } as ScholarshipFilters),
    [params.toString()],
  )

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  return (
    <>
      <PageHeader title="Bolsas de estudo" subtitle="Pesquise e filtre oportunidades. Confirme sempre os detalhes na fonte oficial." />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <form
          className="card h-fit space-y-3"
          role="search"
          aria-label="Filtros de bolsas"
          onSubmit={(e) => e.preventDefault()}
        >
          <div>
            <label htmlFor="f-q" className="label">Pesquisa</label>
            <input id="f-q" className="input" defaultValue={filters.q} placeholder="Nome, instituição…"
              onKeyDown={(e) => { if (e.key === 'Enter') update('q', e.currentTarget.value.trim()) }}
              onBlur={(e) => { if (e.currentTarget.value.trim() !== filters.q) update('q', e.currentTarget.value.trim()) }} />
          </div>
          <div>
            <label htmlFor="f-country" className="label">País de destino</label>
            <input id="f-country" className="input" defaultValue={filters.country}
              onBlur={(e) => update('country', e.currentTarget.value.trim())} />
          </div>
          <Select id="f-level" label="Nível de ensino" value={filters.level ?? ''} onChange={(v) => update('level', v)}
            options={[['', 'Todos'], ['bachelor', 'Licenciatura'], ['master', 'Mestrado'], ['phd', 'Doutoramento'], ['technical', 'Cursos técnicos'], ['other', 'Outros']]} />
          <div>
            <label htmlFor="f-field" className="label">Área de estudo</label>
            <input id="f-field" className="input" defaultValue={filters.field}
              onBlur={(e) => update('field', e.currentTarget.value.trim())} />
          </div>
          <Select id="f-funding" label="Financiamento" value={filters.funding ?? ''} onChange={(v) => update('funding', v)}
            options={[['', 'Todos'], ['full', 'Integral'], ['partial', 'Parcial'], ['other', 'Outro']]} />
          <Select id="f-modality" label="Modalidade" value={filters.modality ?? ''} onChange={(v) => update('modality', v)}
            options={[['', 'Todas'], ['presential', 'Presencial'], ['online', 'Online'], ['hybrid', 'Híbrida']]} />
          <Select id="f-status" label="Estado da candidatura" value={filters.status ?? ''} onChange={(v) => update('status', v)}
            options={[['', 'Todos'], ['open', 'Abertas'], ['closed', 'Fechadas'], ['expired', 'Expiradas']]} />
          <div>
            <label htmlFor="f-deadline" className="label">Prazo até</label>
            <input id="f-deadline" type="date" className="input" value={filters.deadlineBefore}
              onChange={(e) => update('deadlineBefore', e.target.value)} />
          </div>
          <Select id="f-sort" label="Ordenar por" value={filters.sort ?? 'relevance'} onChange={(v) => update('sort', v)}
            options={[['relevance', 'Relevância'], ['deadline', 'Prazo'], ['published', 'Data de publicação']]} />
          <button type="button" className="btn-outline w-full" onClick={() => setParams(new URLSearchParams())}>Limpar filtros</button>
        </form>

        <div aria-live="polite">
          {loading ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> :
            data && data.items.length > 0 ? (
              <>
                <p className="mb-3 text-sm text-slate-600">{data.total} resultado(s)</p>
                <div className="grid gap-4 sm:grid-cols-2">{data.items.map((s) => <ScholarshipCard key={s.id} s={s} />)}</div>
                <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(p) => update('page', String(p))} />
              </>
            ) : (
              <EmptyState title="Nenhuma bolsa encontrada" text="Tente alterar ou remover alguns filtros." />
            )}
        </div>
      </div>
    </>
  )
}

function Select({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}
