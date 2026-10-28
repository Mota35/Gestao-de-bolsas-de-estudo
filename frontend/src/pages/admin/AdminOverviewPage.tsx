import { Link } from 'react-router-dom'
import { DataTable } from '../../components/ui/DataTable'
import { Dot, Notice } from '../../components/ui/Notice'
import { ErrorState, Loading } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import { env } from '../../lib/env'
import { adminService } from '../../services'

const nextRoute: Record<string, string> = { Mentor: '/admin/mentores', Bolsa: '/admin/bolsas', Denúncia: '/admin/denuncias', Integração: '/admin/integracoes' }

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="card p-6 pb-[22px]">
      <p className="text-[14px] text-muted">{label}</p>
      <p className="mt-[13px] text-[36px] font-light leading-9">{value}</p>
      <p className="mt-[3px] text-[12px] text-green">{hint}</p>
    </div>
  )
}

export default function AdminOverviewPage() {
  useDocumentTitle('Visão geral')
  const { user } = useAuth()
  const { data, loading, error, reload } = useAsync(() => adminService.overview(), [])
  if (loading) return <Loading />
  if (error || !data) return <ErrorState message={error ?? 'Não foi possível carregar a visão geral.'} onRetry={reload} />
  const maxWeek = Math.max(...data.weekly.map((w) => w.value), 1)
  const maxContent = Math.max(...data.content.map((c) => c.value), 1)
  const total = data.weekly.reduce((a, w) => a + w.value, 0)
  const demo = env.demoMode

  return (
    <>
      <DashHead eyebrow="Acesso restrito · Administração" title="Visão geral da plataforma" subtitle="Prioriza revisões, acompanha a operação e consulta relatórios autorizados." />
      {demo && (
        <Notice tone="info" title="Relatórios de utilização de demonstração" className="!py-[20px]">
          Todos os números, tendências e registos abaixo são fictícios. Não representam actividade real. Período ilustrativo: 1–26 de outubro de 2026.
        </Notice>
      )}

      <div className="mt-[28px] grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={demo ? 'Utilizadores no exemplo' : 'Utilizadores'} value={data.users.total} hint={`${data.users.students} estudantes · ${data.users.mentors} mentores`} />
        <Stat label="Bolsas no catálogo" value={data.scholarships.total} hint={`${data.scholarships.open} abertas · ${data.scholarships.expired} expiradas`} />
        <Stat label="Mentores pendentes" value={data.pendingMentors} hint={demo ? 'Fila ilustrativa' : 'Por rever'} />
        <Stat label="Denúncias por analisar" value={data.pendingReports} hint="Sem decisões automáticas" />
      </div>

      <div className="mt-[28px] grid items-start gap-7 lg:grid-cols-[1fr_370px]">
        <section className="card p-6 pb-[22px]">
          <div className="flex items-start justify-between gap-3">
          <h2 className="display text-[24px] leading-8">Acções registadas por semana</h2>
            {demo && <Dot tone="gray">Dados fictícios</Dot>}
          </div>
          <p className="mt-[14px] text-[13px] text-muted">Eventos de auditoria nos últimos 28 dias</p>
          <div
            role="img"
            aria-label={`Consultas por semana: ${data.weekly.map((w) => `${w.label}: ${w.value}`).join('; ')}`}
            className="mt-[22px] flex h-[220px] items-end justify-between gap-[32px] px-6"
          >
            {data.weekly.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center justify-end" aria-hidden>
                <span className="mb-[10px] text-[12px] font-bold">{w.value}</span>
                <span className="block w-full rounded-t-[4px] bg-green" style={{ height: `${(w.value / maxWeek) * 160}px` }} />
                <span className="mt-[12px] text-[11px] text-muted">{w.label}</span>
              </div>
            ))}
          </div>
          <p className="small mt-[18px] text-[12px]">
            Total {demo ? 'ilustrativo' : ''}: {total.toLocaleString('pt-PT').replace(/ /g, ' ')} acções registadas.
          </p>
        </section>
        <section className="card p-6 pb-[22px]">
          <h2 className="display text-[24px] leading-8">Conteúdo publicado</h2>
          <ul className="mt-[22px] space-y-[18px]">
            {data.content.map((c) => (
              <li key={c.label}>
                <div className="flex justify-between text-[14px]">
                  <span>{c.label}</span>
                  <strong>{c.value}</strong>
                </div>
                <div className="mt-[10px] h-[6px] rounded-full bg-info" aria-hidden>
                  <div className="h-full rounded-full bg-green" style={{ width: `${(c.value / (maxContent / 0.9)) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {demo && <p className="small mt-[22px] text-[13px]">Contagens apenas para demonstração de relatórios. Não são estatísticas da plataforma.</p>}
        </section>
      </div>

      <div className="mb-[28px] mt-[40px]">
        <h2 className="h-page text-[30px] leading-9">Pendências que precisam de atenção</h2>
      </div>
      <DataTable
        rows={data.pending}
        rowKey={(r) => `${r.type}-${r.resource}`}
        columns={[
          { header: 'Tipo', render: (r) => r.type },
          { header: 'Recurso de exemplo', render: (r) => r.resource },
          { header: 'Recebido em', render: (r) => r.date },
          { header: 'Estado', render: (r) => r.state },
          {
            header: 'Próximo passo',
            render: (r) => (
              <Link to={nextRoute[r.type] ?? '/admin'} className="hover:underline">
                {r.next}
              </Link>
            ),
          },
        ]}
      />
      <div className="mt-[28px] flex flex-wrap gap-4">
        <Link to="/admin/mentores" className="btn">
          Aprovar mentores
        </Link>
        <Link to="/admin/bolsas" className="btn">
          Gerir bolsas
        </Link>
        <Link to="/admin/auditoria" className="btn">
          Consultar auditoria
        </Link>
      </div>
      <p className="small mt-[28px] text-[13px]">
        Papel actual: Administradora · {user?.name}
        {demo ? ' (fictícia)' : ''}. Apenas utilizadores autorizados devem aceder a esta área.
      </p>
    </>
  )
}
