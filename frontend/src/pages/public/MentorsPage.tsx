import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { MentorCard } from '../../components/MentorCard'
import { SelectField } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, Loading } from '../../components/ui/States'
import { mentorSpecialties } from '../../data/options'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { env } from '../../lib/env'
import { mentorService } from '../../services'
import type { MentorQuery } from '../../types'

export default function MentorsPage() {
  useDocumentTitle('Mentores')
  const [q, setQ] = useState('')
  const [f, setF] = useState({ especialidade: '', idioma: 'Português', modalidade: '', precoMax: '20000', disponibilidade: '', verificados: false })
  const [applied, setApplied] = useState<MentorQuery>({})
  const { data, loading, error, reload } = useAsync(() => mentorService.list(applied), [JSON.stringify(applied)])

  const apply = (e?: FormEvent) => {
    e?.preventDefault()
    setApplied({
      q: q.trim(),
      especialidade: f.especialidade,
      idioma: f.idioma,
      modalidade: f.modalidade,
      precoMax: Number(f.precoMax) || undefined,
      disponibilidade: f.disponibilidade,
      apenasVerificados: f.verificados,
    })
  }

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Início', to: '/' }, { label: 'Mentores', to: '/mentores' }, { label: 'Pessoas que ajudam a abrir caminhos' }]}
        title="Pessoas que ajudam a abrir caminhos"
        subtitle="Escolhe orientação pela experiência, especialidade e condições — não por promessas de uma bolsa."
      />
      <div className="bg-page pb-[56px] pt-[36px]">
        <div className="wrap">
          <form onSubmit={apply} role="search" className="flex items-center gap-4 max-lg:flex-col max-lg:items-stretch">
            <label className="field flex-1">
              <span className="field-label">Nome ou especialidade</span>
              <input className="field-control" placeholder="Ex.: candidaturas internacionais" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <button type="submit" className="btn btn-primary">
              <Search size={18} aria-hidden /> Procurar mentores
            </button>
          </form>
          <Notice tone="info" title="Mentorias pagas, escolhas informadas" className="mt-[28px]">
            Os preços são definidos por cada mentor. Um perfil não verificado é identificado como tal.
            {env.demoMode ? ' Todos os perfis e estados apresentados são de demonstração.' : ''}
          </Notice>

          <div className="mt-[28px] grid items-start gap-[28px] lg:grid-cols-[270px_1fr]">
            <form onSubmit={apply} className="card p-[22px] pb-6" aria-label="Filtros de mentores">
              <h2 className="mb-[18px] mt-[2px] pt-[4px] text-[19px] font-bold">Encontra o teu mentor</h2>
              <div className="space-y-4">
                <SelectField label="Especialidade" value={f.especialidade} onChange={(v) => setF({ ...f, especialidade: v })} options={mentorSpecialties} placeholder="Todas" />
                <SelectField label="Idioma" value={f.idioma} onChange={(v) => setF({ ...f, idioma: v })} options={['Português', 'Inglês', 'Francês']} />
                <SelectField
                  label="Modalidade"
                  value={f.modalidade}
                  onChange={(v) => setF({ ...f, modalidade: v })}
                  options={['Online', 'Presencial']}
                  placeholder="Online / Presencial"
                />
                <SelectField
                  label="Preço máximo (Kz / AOA)"
                  value={f.precoMax}
                  onChange={(v) => setF({ ...f, precoMax: v })}
                  options={[
                    { value: '10000', label: 'Até 10 000 Kz' },
                    { value: '20000', label: 'Até 20 000 Kz' },
                    { value: '50000', label: 'Até 50 000 Kz' },
                  ]}
                />
                <SelectField
                  label="Disponibilidade"
                  value={f.disponibilidade}
                  onChange={(v) => setF({ ...f, disponibilidade: v })}
                  options={[{ value: 'dezembro', label: 'Dezembro de 2026' }]}
                  placeholder="Novembro de 2026"
                />
                <label className="check !text-[14px] !pt-[2px]">
                  <input type="checkbox" checked={f.verificados} onChange={(e) => setF({ ...f, verificados: e.target.checked })} />
                  <span className="!mt-0">Apenas perfis verificados</span>
                </label>
                <button type="submit" className="btn btn-primary btn-block">
                  Aplicar filtros
                </button>
              </div>
            </form>

            <section aria-live="polite">
              <div className="mb-[20px] mt-[4px] flex items-center justify-between">
                <h2 className="text-[15px] font-bold">{data ? `${data.length} mentores${env.demoMode ? ' de exemplo' : ''}` : 'A carregar…'}</h2>
                <p className="text-[13px] text-muted">Ordenar: Relevância ↓</p>
              </div>
              {loading && <Loading />}
              {error && <ErrorState message={error} onRetry={reload} />}
              {data && data.length === 0 && <EmptyState title="Sem mentores para estes filtros">Experimenta remover um filtro ou procurar outra especialidade.</EmptyState>}
              {data && data.length > 0 && (
                <div className="grid gap-5 md:grid-cols-2">
                  {data.map((m) => (
                    <MentorCard key={m.slug} m={m} />
                  ))}
                </div>
              )}
              <p className="small mt-[22px]">O contacto pelo WhatsApp só aparece quando o mentor autoriza a divulgação. Nenhum número pessoal é apresentado.</p>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
