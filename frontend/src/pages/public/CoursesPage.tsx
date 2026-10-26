import { useState, type FormEvent } from 'react'
import { courseService } from '../../services/mentors'
import { useAsync } from '../../hooks/useAsync'
import { ServiceCard } from '../../components/MentorCards'
import { EmptyState, ErrorState, PageHeader, Pagination, Spinner } from '../../components/ui'

export default function CoursesPage() {
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState('')
  const [kind, setKind] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useAsync(
    () => courseService.list({ q: applied || undefined, kind: kind || undefined, page }),
    [applied, kind, page],
  )

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPage(1)
    setApplied(q.trim())
  }

  return (
    <>
      <PageHeader title="Cursos e mentorias" subtitle="Serviços publicados por mentores. Os preços são definidos por cada mentor." />
      <form onSubmit={onSubmit} role="search" className="mb-6 flex flex-wrap gap-2">
        <label htmlFor="c-q" className="sr-only">Pesquisar</label>
        <input id="c-q" className="input max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar serviços" />
        <label htmlFor="c-kind" className="sr-only">Tipo</label>
        <select id="c-kind" className="input max-w-[200px]" value={kind} onChange={(e) => { setKind(e.target.value); setPage(1) }}>
          <option value="">Todos os tipos</option>
          <option value="course">Cursos</option>
          <option value="mentoring">Mentorias</option>
        </select>
        <button type="submit" className="btn-primary">Pesquisar</button>
      </form>
      {loading ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> :
        data && data.items.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((s) => <ServiceCard key={s.id} s={s} />)}</div>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          </>
        ) : <EmptyState title="Nenhum serviço encontrado" />}
    </>
  )
}
