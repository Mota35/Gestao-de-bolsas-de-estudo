import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ScholarshipCard } from '../../components/ScholarshipCard'
import { SelectField } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { EmptyState, ErrorState, Loading } from '../../components/ui/States'
import { areas, countries } from '../../data/options'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { env } from '../../lib/env'
import { fundingLabel, levelLabel, modalityLabel } from '../../lib/format'
import { scholarshipService } from '../../services'
import type { Funding, Level, Modality, ScholarshipQuery, SortKey } from '../../types'

const PAGE_SIZE = 6
const levels = Object.keys(levelLabel) as Level[]

interface Draft {
  pais: string
  nivel: Level[]
  area: string
  financiamento: string
  modalidade: string
  estado: string
  prazo: string
  verificacao: string
}
const emptyDraft: Draft = { pais: '', nivel: [], area: '', financiamento: '', modalidade: '', estado: '', prazo: '', verificacao: '' }

/** "dd / mm / aaaa" (ou dd/mm/aaaa) → AAAA-MM-DD; devolve null se inválida. */
function parseDate(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})$/)
  if (!m) return null
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
const isoToText = (iso: string) => (iso ? iso.split('-').reverse().join(' / ') : '')

function readParams(sp: URLSearchParams) {
  const nivel = (sp.get('nivel') ?? '').split(',').filter((x): x is Level => levels.includes(x as Level))
  return {
    q: sp.get('q') ?? '',
    pais: sp.get('pais') ?? '',
    nivel,
    area: sp.get('area') ?? '',
    financiamento: sp.get('fin') ?? '',
    modalidade: sp.get('mod') ?? '',
    estado: sp.get('estado') ?? '',
    prazoAte: sp.get('prazo') ?? '',
    verificacao: sp.get('verif') ?? '',
    sort: (sp.get('ord') as SortKey) || 'prazo',
    page: Math.max(1, Number(sp.get('pag')) || 1),
  }
}

export default function ScholarshipsPage() {
  useDocumentTitle('Bolsas de estudo')
  const [sp, setSp] = useSearchParams()
  const applied = useMemo(() => readParams(sp), [sp])
  const [q, setQ] = useState(applied.q)
  const [draft, setDraft] = useState<Draft>({ ...emptyDraft, ...applied, financiamento: applied.financiamento, prazo: isoToText(applied.prazoAte) })
  const [panel, setPanel] = useState(false)

  useEffect(() => {
    setQ(applied.q)
    setDraft({
      pais: applied.pais,
      nivel: applied.nivel,
      area: applied.area,
      financiamento: applied.financiamento,
      modalidade: applied.modalidade,
      estado: applied.estado,
      prazo: isoToText(applied.prazoAte),
      verificacao: applied.verificacao,
    })
  }, [applied])

  const query: ScholarshipQuery = {
    q: applied.q,
    pais: applied.pais,
    nivel: applied.nivel,
    area: applied.area,
    financiamento: applied.financiamento as Funding | '',
    modalidade: applied.modalidade as Modality | '',
    estado: applied.estado as ScholarshipQuery['estado'],
    prazoAte: applied.prazoAte,
    verificacao: applied.verificacao as ScholarshipQuery['verificacao'],
    sort: applied.sort,
    page: applied.page,
    pageSize: PAGE_SIZE,
  }
  const { data, loading, error, reload } = useAsync(() => scholarshipService.list(query), [sp.toString()])

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp)
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    if (!('pag' in patch)) next.delete('pag')
    setSp(next)
  }

  const apply = (e?: FormEvent) => {
    e?.preventDefault()
    let prazo: string | null = null
    if (draft.prazo.trim()) {
      prazo = parseDate(draft.prazo)
      if (!prazo) {
        toast.error('Data inválida. Usa o formato dd / mm / aaaa.')
        return
      }
    }
    update({
      q: q.trim() || null,
      pais: draft.pais || null,
      nivel: draft.nivel.join(',') || null,
      area: draft.area || null,
      fin: draft.financiamento || null,
      mod: draft.modalidade || null,
      estado: draft.estado || null,
      prazo,
      verif: draft.verificacao || null,
    })
    setPanel(false)
  }
  const clear = () => {
    setQ('')
    setDraft(emptyDraft)
    setSp(new URLSearchParams())
    setPanel(false)
  }

  const chips: Array<{ label: string; key: string[] }> = [
    ...(applied.pais ? [{ label: applied.pais, key: ['pais'] }] : []),
    ...applied.nivel.map((n) => ({ label: levelLabel[n], key: ['nivel', n] })),
    ...(applied.area ? [{ label: applied.area, key: ['area'] }] : []),
    ...(applied.financiamento ? [{ label: fundingLabel[applied.financiamento as Funding] ?? applied.financiamento, key: ['fin'] }] : []),
    ...(applied.modalidade ? [{ label: modalityLabel[applied.modalidade as Modality] ?? applied.modalidade, key: ['mod'] }] : []),
    ...(applied.estado ? [{ label: applied.estado === 'aberta' ? 'Abertas' : 'Expiradas', key: ['estado'] }] : []),
    ...(applied.verificacao ? [{ label: applied.verificacao === 'verificada' ? 'Verificadas' : 'Pendentes', key: ['verif'] }] : []),
    ...(applied.prazoAte ? [{ label: `Até ${isoToText(applied.prazoAte)}`, key: ['prazo'] }] : []),
  ]
  const removeChip = (key: string[]) => {
    if (key[0] === 'nivel') update({ nivel: applied.nivel.filter((n) => n !== key[1]).join(',') || null })
    else update({ [key[0]]: null })
  }

  const hasFilters = chips.length > 0 || !!applied.q

  /* ---------- Estado vazio ---------- */
  if (data && data.total === 0) {
    return (
      <div className="bg-page pb-24 pt-[44px]">
        <div className="mx-auto w-[min(1040px,100%-48px)]">
          <h1 className="display text-[36px] leading-[44px]">Bolsas de estudo</h1>
          <form onSubmit={apply} className="mt-[24px] flex items-center gap-4 max-sm:flex-col max-sm:items-stretch" role="search">
            <label className="field flex-1">
              <span className="field-label">Nome, instituição ou palavra-chave</span>
              <input className="field-control" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <button type="submit" className="btn btn-primary">
              Pesquisar
            </button>
          </form>
          <ChipRow chips={chips} onRemove={removeChip} />
          <div className="mt-[24px]">
            <EmptyState
              title="Ainda não há resultados para esta pesquisa"
              actions={
                <>
                  <button type="button" className="btn btn-primary" onClick={clear}>
                    Limpar filtros
                  </button>
                  <Link to="/bolsas" className="btn" onClick={clear}>
                    Ver todas as bolsas
                  </Link>
                </>
              }
            >
              Experimenta outro termo, remove um filtro ou procura um destino diferente. Não precisas de alterar todos os critérios de uma vez.
            </EmptyState>
            <p className="-mt-[60px] pb-12 text-center text-[12px] text-muted max-sm:mt-4">
              {env.demoMode ? 'Estado complementar de demonstração · 0 oportunidades' : '0 oportunidades'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const filtersForm = (
    <form onSubmit={apply} className="space-y-4" aria-label="Filtros de bolsas">
      <SelectField label="País de destino" value={draft.pais} onChange={(v) => setDraft({ ...draft, pais: v })} options={countries} placeholder="Todos os países" />
      <fieldset className="border-0 p-0">
        <legend className="mb-[12px] pt-[6px] text-[14px] font-bold">Nível académico</legend>
        <div className="space-y-[9px]">
          {levels.map((l) => (
            <label key={l} className="check !text-[14px]">
              <input
                type="checkbox"
                checked={draft.nivel.includes(l)}
                onChange={(e) => setDraft({ ...draft, nivel: e.target.checked ? [...draft.nivel, l] : draft.nivel.filter((x) => x !== l) })}
              />
              <span className="!mt-0">{levelLabel[l]}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <hr className="border-0 border-t border-line" />
      <SelectField label="Área de estudo" value={draft.area} onChange={(v) => setDraft({ ...draft, area: v })} options={areas} placeholder="Todas as áreas" />
      <SelectField
        label="Financiamento"
        value={draft.financiamento}
        onChange={(v) => setDraft({ ...draft, financiamento: v })}
        options={[
          { value: 'integral', label: 'Integral' },
          { value: 'parcial', label: 'Parcial' },
          { value: 'outro', label: 'Outro apoio' },
        ]}
        placeholder="Integral / Parcial / Outro"
      />
      <SelectField
        label="Modalidade"
        value={draft.modalidade}
        onChange={(v) => setDraft({ ...draft, modalidade: v })}
        options={[
          { value: 'presencial', label: 'Presencial' },
          { value: 'online', label: 'Online' },
          { value: 'hibrida', label: 'Híbrida' },
        ]}
        placeholder="Presencial / Online / Híbrida"
      />
      <SelectField
        label="Estado da candidatura"
        value={draft.estado}
        onChange={(v) => setDraft({ ...draft, estado: v })}
        options={[
          { value: 'aberta', label: 'Aberta' },
          { value: 'expirada', label: 'Expirada' },
        ]}
        placeholder="Todos os estados"
      />
      <label className="field">
        <span className="field-label">Prazo até</span>
        <input className="field-control" inputMode="numeric" placeholder="dd / mm / aaaa" value={draft.prazo} onChange={(e) => setDraft({ ...draft, prazo: e.target.value })} />
      </label>
      <SelectField
        label="Verificação"
        value={draft.verificacao}
        onChange={(v) => setDraft({ ...draft, verificacao: v })}
        options={[
          { value: 'verificada', label: 'Verificada' },
          { value: 'pendente', label: 'Pendente' },
        ]}
        placeholder="Todos os estados"
      />
      <button type="submit" className="btn btn-primary btn-block !mt-5">
        Aplicar filtros
      </button>
    </form>
  )

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Início', to: '/' }, { label: 'Bolsas', to: '/bolsas' }, { label: 'Encontra a tua próxima oportunidade' }]}
        title={
          <>
            <span className="max-lg:hidden">Encontra a tua próxima oportunidade</span>
            <span className="lg:hidden">Encontra a tua oportunidade</span>
          </>
        }
        subtitle="Compara destinos, requisitos e financiamento. A decisão começa com boa informação."
      />
      <div className="bg-page pb-[64px] pt-[32px] max-lg:pb-10">
        <div className="wrap">
          <form onSubmit={apply} role="search" className="flex items-center gap-4 max-lg:flex-col max-lg:items-stretch">
            <label className="field flex-1">
              <span className="field-label">Nome, instituição ou palavra-chave</span>
              <input className="field-control" placeholder="Ex.: Engenharia, Instituto Horizonte" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <button type="submit" className="btn btn-primary">
              <Search size={18} aria-hidden /> Pesquisar
            </button>
          </form>

          <div className="mt-6 flex gap-4 lg:hidden">
            <button type="button" className="btn flex-1" onClick={() => setPanel((p) => !p)} aria-expanded={panel}>
              <SlidersHorizontal size={16} aria-hidden /> Filtros
            </button>
            <label className="btn flex-1 !p-0">
              <span className="sr-only">Ordenar por</span>
              <select
                className="h-full w-full cursor-pointer bg-transparent px-5 text-center font-semibold"
                value={applied.sort}
                onChange={(e) => update({ ord: e.target.value === 'prazo' ? null : e.target.value })}
              >
                <option value="prazo">Ordenar</option>
                <option value="publicacao">Data de publicação</option>
                <option value="relevancia">Relevância</option>
              </select>
            </label>
          </div>

          <Notice tone="info" title={env.demoMode ? 'Oportunidades de demonstração' : 'Antes de te candidatares'} className="mt-[22px] max-lg:mt-4">
            {env.demoMode
              ? 'Os dados são ilustrativos. Verificação e candidatura são estados diferentes. Consulta sempre a fonte oficial e o prazo.'
              : 'Verificação e candidatura são estados diferentes. Consulta sempre a fonte oficial e o prazo.'}
          </Notice>

          {panel && (
            <section className="card mt-4 p-5 lg:hidden" aria-label="Filtros">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[20px] font-bold">Filtros</h2>
                <button type="button" onClick={() => setPanel(false)} aria-label="Fechar filtros">
                  <X size={22} />
                </button>
              </div>
              {filtersForm}
              <button type="button" className="btn btn-block mt-3" onClick={clear}>
                Limpar filtros
              </button>
            </section>
          )}

          <div className="mt-6 grid items-start gap-[28px] lg:grid-cols-[270px_1fr]">
            <aside className="card max-lg:hidden p-[22px]" aria-label="Filtros">
              <div className="mb-[24px] flex items-center justify-between pt-[7px]">
                <h2 className="text-[18px] font-bold">Filtrar bolsas</h2>
                <button type="button" className="text-[12px] text-green hover:underline" onClick={clear}>
                  Limpar
                </button>
              </div>
              {filtersForm}
            </aside>

            <section aria-live="polite">
              <div className="mb-[18px] flex items-start justify-between gap-4 max-lg:flex-col">
                <h2 className="pt-[30px] text-[15px] font-bold max-lg:pt-0">
                  {data ? `${data.total} ${env.demoMode ? 'oportunidades de exemplo' : data.total === 1 ? 'oportunidade' : 'oportunidades'}` : 'A carregar…'}
                </h2>
                <div className="w-[270px] max-lg:hidden">
                  <SelectField
                    label="Ordenar por"
                    value={applied.sort}
                    onChange={(v) => update({ ord: v === 'prazo' ? null : v })}
                    options={[
                      { value: 'prazo', label: 'Prazo mais próximo' },
                      { value: 'publicacao', label: 'Data de publicação' },
                      { value: 'relevancia', label: 'Relevância' },
                    ]}
                    hint="Também: publicação ou relevância"
                    className="[&_.field]:!min-h-[86px]"
                  />
                </div>
              </div>
              <ChipRow chips={chips} onRemove={removeChip} defaults={!hasFilters} />
              {loading && <Loading />}
              {error && <ErrorState message={error} onRetry={reload} />}
              {data && (
                <>
                  <div className="mt-[28px] grid gap-5 md:grid-cols-2 max-lg:mt-4">
                    {data.items.map((s) => (
                      <ScholarshipCard key={s.id} s={s} />
                    ))}
                  </div>
                  <Pagination page={data.page} total={data.total} pageSize={data.pageSize} onChange={(p) => update({ pag: p > 1 ? String(p) : null })} />
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  )
}

function ChipRow({ chips, onRemove, defaults = false }: { chips: Array<{ label: string; key: string[] }>; onRemove: (k: string[]) => void; defaults?: boolean }) {
  if (defaults) {
    return (
      <div className="mt-[22px] flex flex-wrap gap-4 text-[12px] font-semibold text-muted max-lg:hidden">
        <span className="dot-label">Todos os destinos</span>
        <span className="dot-label">Todos os níveis</span>
      </div>
    )
  }
  return (
    <div className="mt-[28px] flex flex-wrap gap-4 text-[12px] font-semibold text-muted">
      {chips.map((c) => (
        <span key={c.key.join('-')} className="dot-label">
          {c.label}
          <button type="button" onClick={() => onRemove(c.key)} aria-label={`Remover filtro ${c.label}`} className="ml-0.5 text-[13px] leading-none">
            ×
          </button>
        </span>
      ))}
    </div>
  )
}
