import { useState, type FormEvent } from 'react'
import { ServiceCard } from '../../components/ServiceCard'
import { SelectField } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, Loading } from '../../components/ui/States'
import { mentorSpecialties } from '../../data/options'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { env } from '../../lib/env'
import { courseService } from '../../services'
import type { ServiceQuery } from '../../types'

export default function CoursesPage() {
  useDocumentTitle('Cursos e mentorias')
  const [f, setF] = useState({ q: '', tipo: '', modalidade: '', especialidade: '', preco: '', disponibilidade: '', verificacao: '' })
  const [applied, setApplied] = useState<ServiceQuery>({})
  const { data, loading, error, reload } = useAsync(() => courseService.list(applied), [JSON.stringify(applied)])
  const set = (k: keyof typeof f) => (v: string) => {
    const next = { ...f, [k]: v }
    setF(next)
    if (k !== 'q') setApplied(next as ServiceQuery) // os filtros em caixa aplicam-se de imediato
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setApplied(f as ServiceQuery)
  }
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Início', to: '/' }, { label: 'Cursos e mentorias', to: '/cursos-e-mentorias' }, { label: 'Aprende. Prepara-te. Avança.' }]}
        title="Aprende. Prepara-te. Avança."
        subtitle="Cursos e mentorias pagos, com condições claras e contacto directo com cada profissional."
      />
      <div className="bg-page pb-[44px] pt-[36px]">
        <div className="wrap">
          <form onSubmit={submit} role="search" className="card grid items-center gap-4 p-6 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="field">
              <span className="field-label">Pesquisar serviço ou mentor</span>
              <input className="field-control" placeholder="O que gostarias de aprender?" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
            </label>
            <SelectField
              label="Tipo de serviço"
              value={f.tipo}
              onChange={set('tipo')}
              options={[
                { value: 'curso', label: 'Curso' },
                { value: 'mentoria', label: 'Mentoria' },
              ]}
              placeholder="Curso / Mentoria"
            />
            <SelectField
              label="Modalidade"
              value={f.modalidade}
              onChange={set('modalidade')}
              options={[
                { value: 'online', label: 'Online' },
                { value: 'presencial', label: 'Presencial' },
              ]}
              placeholder="Todas"
            />
            <button type="submit" className="btn btn-primary">
              Pesquisar
            </button>
          </form>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField label="Especialidade" value={f.especialidade} onChange={set('especialidade')} options={mentorSpecialties} placeholder="Todas as áreas" />
            <SelectField
              label="Preço (AOA)"
              value={f.preco}
              onChange={set('preco')}
              options={[
                { value: 'ate-10000', label: 'Até 10 000 Kz' },
                { value: 'ate-20000', label: 'Até 20 000 Kz' },
                { value: 'mais-20000', label: 'Mais de 20 000 Kz' },
              ]}
              placeholder="Todos os valores"
            />
            <SelectField
              label="Disponibilidade"
              value={f.disponibilidade}
              onChange={set('disponibilidade')}
              options={[{ value: 'dezembro', label: 'Dezembro de 2026' }]}
              placeholder="Novembro de 2026"
            />
            <SelectField
              label="Verificação do mentor"
              value={f.verificacao}
              onChange={set('verificacao')}
              options={[
                { value: 'verificados', label: 'Perfis verificados' },
                { value: 'nao-verificados', label: 'Perfis não verificados' },
              ]}
              placeholder="Todos os perfis"
            />
          </div>

          <Notice tone="info" title={env.demoMode ? 'Não existe pagamento ou inscrição neste protótipo' : 'Pagamento e inscrição directamente com o mentor'} className="mt-6">
            {env.demoMode
              ? 'Os serviços, preços e disponibilidades são exemplos. Compara as condições e confirma directamente com o mentor.'
              : 'Compara as condições e confirma directamente com o mentor.'}
          </Notice>

          <div className="mb-5 mt-[34px] flex items-center justify-between">
            <h2 className="text-[16px] font-bold">{data ? `${data.length} serviços${env.demoMode ? ' de demonstração' : ''}` : 'A carregar…'}</h2>
            <p className="text-[13px] text-muted">Ordenar: Relevância ↓</p>
          </div>
          {loading && <Loading />}
          {error && <ErrorState message={error} onRetry={reload} />}
          {data && data.length === 0 && <EmptyState title="Sem serviços para estes filtros">Experimenta alterar a modalidade ou o tipo de serviço.</EmptyState>}
          {data && data.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {data.map((s) => (
                <ServiceCard key={s.id} s={s} />
              ))}
            </div>
          )}
          <p className="small mt-6">
            Mentoria individual ou curso em grupo: confirma o formato, o conteúdo, o preço final e as condições de cancelamento. Serviços pagos não dão acesso privilegiado a
            bolsas.
          </p>
        </div>
      </div>
    </>
  )
}
