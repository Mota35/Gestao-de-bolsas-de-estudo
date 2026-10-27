import { ChevronRight, Bookmark, MessagesSquare, Send, Settings, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ScholarshipCard } from '../../components/ScholarshipCard'
import { ServiceCard } from '../../components/ServiceCard'
import { Dot, Notice } from '../../components/ui/Notice'
import { ErrorState, Loading } from '../../components/ui/States'
import { useAuth } from '../../contexts/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'
import { env } from '../../lib/env'
import { callStatus, formatDate } from '../../lib/format'
import { courseService, favoriteService, studentService } from '../../services'

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="card p-6 pb-[22px]">
      <p className="text-[14px] text-muted">{label}</p>
      <p className="mt-[13px] text-[36px] font-light leading-9">{value}</p>
      <p className="mt-[3px] text-[12px] text-green">{hint}</p>
    </div>
  )
}

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-[28px] mt-[40px] flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="h-page text-[30px] leading-9">{title}</h2>
        {subtitle && <p className="text-[15px] leading-5 text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const shortTitle = (t: string) => t.replace(/^(Bolsa|Programa) /, '').split(' para ')[0]

const quick = [
  { to: '/estudante/perfil', label: 'O meu perfil', icon: UserRound },
  { to: '/estudante/guardadas', label: 'Bolsas guardadas', icon: Bookmark },
  { to: '/estudante/candidaturas', label: 'Candidaturas', icon: Send },
  { to: '/cursos-e-mentorias', label: 'Cursos e mentorias', icon: MessagesSquare },
  { to: '/estudante/conta', label: 'Conta e preferências', icon: Settings },
]

export default function StudentDashboardPage() {
  useDocumentTitle('Painel do estudante')
  const { user } = useAuth()
  const profile = useAsync(() => studentService.profile(), [])
  const saved = useAsync(() => favoriteService.list(), [])
  const recs = useAsync(() => studentService.recommendations(), [])
  const services = useAsync(() => courseService.list({}), [])

  if (profile.loading || saved.loading) return <Loading />
  if (profile.error || !profile.data) return <ErrorState message={profile.error ?? 'Não foi possível carregar o perfil.'} onRetry={profile.reload} />
  const p = profile.data
  const first = (p.displayName || user?.name || '').split(' ')[0]
  const savedList = saved.data ?? []
  const expired = savedList.filter((s) => callStatus(s.deadline) === 'expirada').length
  const initials = (
    user?.initials ??
    p.displayName
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
  ).toUpperCase()

  return (
    <>
      <DashHead eyebrow="O teu espaço" title={`Olá, ${first}. Vamos ao próximo passo?`} subtitle="Organiza as tuas escolhas e prepara o teu percurso com calma." />

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-[360px_1fr_1fr]">
        <section className="card col-span-2 p-6 lg:col-span-1 lg:row-span-2" aria-label="O teu perfil">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-green">
              <span className="h-2 w-2 rounded-full bg-green" aria-hidden />
              {initials}
            </span>
            <h2 className="display text-[22px] leading-7">{p.displayName}</h2>
          </div>
          <p className="mt-[6px] pl-[40px] text-[12px] text-muted max-sm:pl-0">{env.demoMode ? 'Perfil fictício · ' : ''}Estudante</p>
          <p className="mt-[20px] text-[14px] leading-[21px]">
            {p.nationality} · {p.academicLevel.replace(' concluído', '')}
            <br />
            Área: {p.area}
            <br />
            País pretendido: {p.targetCountry}
          </p>
          <Link to="/estudante/perfil" className="btn btn-block mt-[20px]">
            Editar o meu perfil
          </Link>
        </section>
        <Stat label="Bolsas guardadas" value={savedList.length} hint={expired ? `Inclui ${expired} expirada${expired > 1 ? 's' : ''}` : 'Todas abertas'} />
        <Stat label={env.demoMode ? 'Compatíveis no exemplo' : 'Compatíveis'} value={recs.data?.length ?? 0} hint="Com base no teu perfil" />
        <Notice tone="success" title="O teu perfil orienta as sugestões" className="col-span-2">
          As sugestões usam nacionalidade, nível, área e país pretendido. Compatibilidade não significa elegibilidade confirmada.
        </Notice>
      </div>

      <nav aria-label="Acesso rápido" className="card mt-5 p-6 lg:hidden">
        <h2 className="display text-[20px] leading-7">Acesso rápido</h2>
        <ul className="mt-3">
          {quick.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link to={to} className="flex items-center gap-3 py-[15px] text-[15px]">
                <Icon size={20} strokeWidth={1.6} className="text-green" aria-hidden />
                <span className="flex-1">{label}</span>
                <ChevronRight size={16} className="text-green" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <SectionTitle
        title="Oportunidades para o teu percurso"
        subtitle={`Correspondência ${env.demoMode ? 'ilustrativa' : 'por perfil'}: ${p.nationality === 'Angolana' ? 'Angola' : p.nationality} · ${p.targetLevel} ou curso técnico · ${p.area} · ${p.targetCountry} ou Angola.`}
        action={
          <Link to="/bolsas" className="btn">
            Explorar todas
          </Link>
        }
      />
      {recs.error && <ErrorState message={recs.error} onRetry={recs.reload} />}
      <div className="grid items-start gap-6 md:grid-cols-2">
        {recs.data?.map((s) => (
          <ScholarshipCard key={s.id} s={s} />
        ))}
      </div>

      <div className="mt-[28px] grid items-start gap-6 md:grid-cols-2">
        <section className="card p-6">
          <h2 className="display text-[22px] leading-8">Retoma as tuas bolsas guardadas</h2>
          <ul className="mt-[22px] text-[16px] leading-[21px] text-muted">
            {savedList.map((s) => (
              <li key={s.id} className="mb-[1px]">
                {shortTitle(s.title)} · {callStatus(s.deadline) === 'aberta' ? 'aberta até' : 'expirada em'} {formatDate(s.deadline)}
              </li>
            ))}
            {savedList.length === 0 && <li>Ainda não guardaste nenhuma bolsa.</li>}
          </ul>
          <Link to="/estudante/guardadas" className="btn mt-[26px]">
            Ver bolsas guardadas
          </Link>
        </section>
        <section className="card p-6">
          <h2 className="display text-[22px] leading-8">Candidaturas no site oficial</h2>
          <Dot tone="amber" className="mt-[14px]">
            Acompanhamento indisponível
          </Dot>
          <p className="mt-[18px] text-[16px] leading-[21px] text-muted">
            Ainda não acompanhamos envios ou decisões. Consulta o portal da instituição e guarda os teus comprovativos fora da plataforma.
          </p>
          <Link to="/estudante/candidaturas" className="btn mt-[22px]">
            Saber como proceder
          </Link>
        </section>
      </div>

      <SectionTitle
        title="Cursos e mentorias para te preparar"
        subtitle={env.demoMode ? 'Serviços pagos de exemplo, sem garantia de admissão.' : 'Serviços pagos, sem garantia de admissão.'}
        action={
          <Link to="/cursos-e-mentorias" className="btn">
            Ver catálogo
          </Link>
        }
      />
      <div className="grid items-start gap-6 md:grid-cols-2">
        {services.data?.slice(0, 2).map((s) => (
          <ServiceCard key={s.id} s={s} showMentorLine />
        ))}
      </div>
    </>
  )
}
