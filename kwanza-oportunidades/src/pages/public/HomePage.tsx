import type { ReactNode } from 'react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { scholarshipService } from '../../services/scholarships'
import { courseService } from '../../services/mentors'
import { useAsync } from '../../hooks/useAsync'
import { ScholarshipCard } from '../../components/ScholarshipCard'
import { ServiceCard } from '../../components/MentorCards'
import { EmptyState, ErrorState, Spinner } from '../../components/ui'

export default function HomePage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const featured = useAsync(() => scholarshipService.featured(), [])
  const recent = useAsync(() => scholarshipService.recent(), [])
  const services = useAsync(() => courseService.list({ page: 1 }), [])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    navigate(`/bolsas${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }

  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-brand-700 px-6 py-12 text-white sm:px-10">
        <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">
          Encontre bolsas de estudo e mentores para o seu próximo passo
        </h1>
        <p className="mt-3 max-w-2xl text-slate-200">
          A Kwanza Oportunidades reúne bolsas de estudo e mentorias para estudantes angolanos, com a
          origem e o estado de verificação de cada informação bem visíveis.
        </p>
        <form onSubmit={onSearch} role="search" className="mt-6 flex max-w-xl gap-2">
          <label htmlFor="home-q" className="sr-only">Pesquisar bolsas</label>
          <input
            id="home-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, instituição ou palavra-chave"
            className="input text-slate-900"
          />
          <button type="submit" className="btn-accent shrink-0">
            <Search className="h-4 w-4" aria-hidden /> Pesquisar
          </button>
        </form>
      </section>

      <HomeBlock title="Bolsas em destaque" link="/bolsas" linkLabel="Ver todas as bolsas">
        {featured.loading ? <Spinner /> : featured.error ? <ErrorState message={featured.error} onRetry={featured.reload} /> :
          featured.data && featured.data.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{featured.data.map((s) => <ScholarshipCard key={s.id} s={s} />)}</div>
          ) : <EmptyState title="Sem bolsas em destaque" text="Volte em breve ou explore a lista completa." />}
      </HomeBlock>

      <HomeBlock title="Mentorias e cursos disponíveis" link="/cursos" linkLabel="Ver cursos e mentorias">
        {services.loading ? <Spinner /> : services.error ? <ErrorState message={services.error} onRetry={services.reload} /> :
          services.data && services.data.items.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{services.data.items.slice(0, 3).map((s) => <ServiceCard key={s.id} s={s} />)}</div>
          ) : <EmptyState title="Ainda não há serviços publicados" />}
      </HomeBlock>

      <HomeBlock title="Oportunidades recentes" link="/bolsas?sort=published" linkLabel="Ver mais recentes">
        {recent.loading ? <Spinner /> : recent.error ? <ErrorState message={recent.error} onRetry={recent.reload} /> :
          recent.data && recent.data.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{recent.data.map((s) => <ScholarshipCard key={s.id} s={s} />)}</div>
          ) : <EmptyState title="Sem oportunidades recentes" />}
      </HomeBlock>
    </div>
  )
}

function HomeBlock({ title, link, linkLabel, children }: { title: string; link: string; linkLabel: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-bold text-brand-700">{title}</h2>
        <Link to={link} className="text-sm font-medium text-brand-600 hover:underline">{linkLabel}</Link>
      </div>
      {children}
    </section>
  )
}
