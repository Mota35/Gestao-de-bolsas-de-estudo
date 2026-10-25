import { useState, type FormEvent } from 'react'
import { mentorService } from '../../services/mentors'
import { useAsync } from '../../hooks/useAsync'
import { MentorCard } from '../../components/MentorCards'
import { EmptyState, ErrorState, PageHeader, Pagination, Spinner } from '../../components/ui'

export default function MentorsPage() {
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useAsync(() => mentorService.list({ q: applied || undefined, page }), [applied, page])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPage(1)
    setApplied(q.trim())
  }

  return (
    <>
      <PageHeader title="Mentores" subtitle="Perfis não verificados estão claramente identificados." />
      <form onSubmit={onSubmit} role="search" className="mb-6 flex max-w-lg gap-2">
        <label htmlFor="m-q" className="sr-only">Pesquisar mentores</label>
        <input id="m-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou especialidade" />
        <button className="btn-primary" type="submit">Pesquisar</button>
      </form>
      {loading ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> :
        data && data.items.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.items.map((m) => <MentorCard key={m.id} m={m} />)}</div>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          </>
        ) : <EmptyState title="Nenhum mentor encontrado" />}
    </>
  )
}
