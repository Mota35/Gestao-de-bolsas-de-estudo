import { ArrowUpRight, Bookmark, BookmarkCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFavorites } from '../contexts/FavoritesContext'
import type { Scholarship } from '../types'

export function ScholarshipCard({ s }: { s: Scholarship }) {
  const { saved, toggle } = useFavorites()
  const isSaved = saved.has(s.slug)
  return (
    <article className="card flex flex-col overflow-hidden">
      <img src={s.photo || '/img/scholarship-placeholder.svg'} alt={`Imagem de ${s.title}`} className="h-[190px] w-full object-cover" />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[19px] font-semibold leading-7 text-ink">{s.title}</h3>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
          <Link to={`/bolsas/${s.slug}#descricao`} className="btn btn-sm btn-primary" aria-label={`Ver descrição de ${s.title}`}>
            Descrição <ArrowUpRight size={14} aria-hidden />
          </Link>
          <button type="button" onClick={() => toggle(s.slug)} className="btn btn-sm" aria-pressed={isSaved}>
            {isSaved ? <BookmarkCheck size={14} aria-hidden /> : <Bookmark size={14} aria-hidden />}
            {isSaved ? 'Guardada' : 'Guardar'}
          </button>
        </div>
      </div>
    </article>
  )
}
