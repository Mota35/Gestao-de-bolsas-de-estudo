import { ArrowUpRight, Bookmark, BookmarkCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFavorites } from '../contexts/FavoritesContext'
import { callStatus, formatDate, fundingLabel, levelLabel, modalityLabel } from '../lib/format'
import type { Scholarship } from '../types'
import { Dot } from './ui/Notice'

export function ScholarshipCard({ s }: { s: Scholarship }) {
  const { saved, toggle } = useFavorites()
  const status = callStatus(s.deadline)
  const open = status === 'aberta'
  const isSaved = saved.has(s.slug)
  return (
    <article className="card flex flex-col p-5 pb-[26px]">
      <Dot tone={open ? 'green' : 'red'} className="!text-[11px] !font-normal">
        {open ? 'Candidatura aberta' : 'Candidatura expirada'}
      </Dot>
      <p className={`mt-[2px] text-[11px] leading-[18px] ${s.verification === 'pendente' ? 'text-amber' : 'text-muted'}`}>
        {s.verification === 'verificada' ? `Verificada${s.isDemo ? ' · exemplo' : ''}` : 'Verificação pendente'}
      </p>
      <h3 className="mt-[18px] text-[19px] font-light leading-[28px] text-ink">{s.title}</h3>
      <p className="text-[12px] leading-[18px] text-muted">
        {s.institution}
        {s.isDemo ? ' · Instituição fictícia' : ''}
      </p>
      <p className="mt-[18px] text-[13px] leading-5 text-ink">
        {s.country} · {levelLabel[s.level]} · {modalityLabel[s.modality]}
      </p>
      <p className="mt-[3px] text-[13px] leading-5 text-green">Financiamento: {fundingLabel[s.funding]}</p>
      <hr className="my-[18px] border-0 border-t border-line" />
      <p className="text-[10px] uppercase leading-4 tracking-[0.02em] text-muted">Prazo de candidatura</p>
      <p className={`mt-[3px] text-[13px] leading-5 ${open ? 'text-ink' : 'text-danger'}`}>{formatDate(s.deadline)}</p>
      <p className="mt-[19px] text-[11px] leading-[17px] text-muted">
        Fonte: portal de {s.institution} · {s.isDemo ? 'exemplo. ' : ''}Consulte o edital oficial antes de se candidatar.
      </p>
      <div className="mt-[18px] flex items-center gap-4">
        <Link to={`/bolsas/${s.slug}`} className="link-green inline-flex items-center gap-1" aria-label={`Ver detalhes de ${s.title}`}>
          Ver detalhes <ArrowUpRight size={11} strokeWidth={3} aria-hidden />
        </Link>
        <button type="button" onClick={() => toggle(s.slug)} className="link-green inline-flex items-center gap-1" aria-pressed={isSaved}>
          {isSaved ? <BookmarkCheck size={11} aria-hidden /> : <Bookmark size={11} aria-hidden />}
          {isSaved ? 'Guardada' : 'Guardar'}
        </button>
      </div>
    </article>
  )
}
