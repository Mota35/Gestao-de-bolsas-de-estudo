import { Link } from 'react-router-dom'
import { Building2, CalendarDays, GraduationCap, Globe2, Heart, Info } from 'lucide-react'
import type { Scholarship } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { useFavorites } from '../contexts/FavoritesContext'
import { Badge, DemoBadge } from './ui'
import {
  effectiveStatus,
  formatDate,
  fundingLabels,
  levelLabels,
  statusLabels,
  verificationLabels,
} from '../utils/format'

export function VerificationBadge({ v }: { v: Scholarship['verification'] }) {
  return <Badge tone={v === 'verified' ? 'green' : v === 'pending' ? 'amber' : 'red'}>{verificationLabels[v]}</Badge>
}

export function StatusBadge({ s }: { s: Scholarship }) {
  const st = effectiveStatus(s)
  return <Badge tone={st === 'open' ? 'blue' : 'red'}>{statusLabels[st]}</Badge>
}

export function ScholarshipCard({ s }: { s: Scholarship }) {
  const { user } = useAuth()
  const { isFavorite, toggle } = useFavorites()
  const fav = isFavorite(s.id)
  return (
    <article className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <VerificationBadge v={s.verification} />
        <StatusBadge s={s} />
        {s.isDemo && <DemoBadge />}
      </div>
      <h3 className="text-lg font-semibold text-brand-700">
        <Link to={`/bolsas/${s.id}`} className="hover:underline">{s.title}</Link>
      </h3>
      <ul className="space-y-1 text-sm text-slate-600">
        <li className="flex items-center gap-2"><Building2 className="h-4 w-4" aria-hidden />{s.institution}</li>
        <li className="flex items-center gap-2"><Globe2 className="h-4 w-4" aria-hidden />{s.country}</li>
        <li className="flex items-center gap-2"><GraduationCap className="h-4 w-4" aria-hidden />{levelLabels[s.level]} · {fundingLabels[s.funding]}</li>
        <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden />Prazo: {formatDate(s.deadline)}</li>
        <li className="flex items-center gap-2"><Info className="h-4 w-4" aria-hidden />Fonte: {s.sourceName}</li>
      </ul>
      <div className="mt-auto flex items-center justify-between pt-2">
        <Link to={`/bolsas/${s.id}`} className="btn-primary">Ver detalhes</Link>
        {user && (
          <button
            type="button"
            onClick={() => void toggle(s.id)}
            aria-pressed={fav}
            aria-label={fav ? 'Remover dos favoritos' : 'Guardar nos favoritos'}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          >
            <Heart className={`h-5 w-5 ${fav ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        )}
      </div>
    </article>
  )
}
