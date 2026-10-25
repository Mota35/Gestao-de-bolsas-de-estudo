import { Link } from 'react-router-dom'
import { BadgeCheck, Clock, Languages } from 'lucide-react'
import type { Mentor, MentorService } from '../types'
import { Badge, DemoBadge } from './ui'
import { formatPrice } from '../utils/format'

export function MentorVerification({ v }: { v: Mentor['verification'] }) {
  if (v === 'verified') {
    return (
      <Badge tone="green">
        <BadgeCheck className="mr-1 h-3 w-3" aria-hidden />Perfil verificado
      </Badge>
    )
  }
  return <Badge tone={v === 'pending' ? 'amber' : 'red'}>{v === 'pending' ? 'Perfil não verificado' : 'Perfil rejeitado'}</Badge>
}

export function MentorCard({ m }: { m: Mentor }) {
  return (
    <article className="card flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {m.photoUrl ? (
          <img src={m.photoUrl} alt={`Fotografia de ${m.name}`} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
            {m.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-brand-700">
            <Link to={`/mentores/${m.id}`} className="hover:underline">{m.name}</Link>
          </h3>
          <p className="text-sm text-slate-600">{m.headline}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <MentorVerification v={m.verification} />
        {m.isDemo && <DemoBadge />}
      </div>
      <p className="flex items-center gap-2 text-sm text-slate-600"><Languages className="h-4 w-4" aria-hidden />{m.languages.join(', ')}</p>
      <div className="flex flex-wrap gap-1">
        {m.specialties.slice(0, 4).map((s) => <Badge key={s} tone="blue">{s}</Badge>)}
      </div>
      <Link to={`/mentores/${m.id}`} className="btn-outline mt-auto">Ver perfil</Link>
    </article>
  )
}

export function ServiceCard({ s }: { s: MentorService }) {
  return (
    <article className="card flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="blue">{s.kind === 'course' ? 'Curso' : 'Mentoria'}</Badge>
        <Badge>{s.mode === 'online' ? 'Online' : 'Presencial'}</Badge>
        {s.isDemo && <DemoBadge />}
      </div>
      <h3 className="font-semibold text-brand-700">
        <Link to={`/servicos/${s.id}`} className="hover:underline">{s.title}</Link>
      </h3>
      {s.mentorName && <p className="text-sm text-slate-600">por {s.mentorName}</p>}
      <p className="line-clamp-3 text-sm text-slate-600">{s.description}</p>
      <p className="flex items-center gap-2 text-sm text-slate-600"><Clock className="h-4 w-4" aria-hidden />{s.availability}</p>
      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="font-semibold text-slate-900">{formatPrice(s.price, s.currency)}</span>
        <Link to={`/servicos/${s.id}`} className="btn-primary">Ver detalhes</Link>
      </div>
    </article>
  )
}
