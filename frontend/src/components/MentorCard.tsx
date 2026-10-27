import { Link } from 'react-router-dom'
import { formatKz } from '../lib/format'
import type { Mentor } from '../types'
import { Dot } from './ui/Notice'

export function MentorCard({ m }: { m: Mentor }) {
  return (
    <article className="card flex flex-col p-6 pb-[23px]">
      <h3 className="text-[22px] font-bold leading-7 tracking-tight">{m.name}</h3>
      <p className="mt-[1px] text-[12px] text-muted">{m.isDemo ? 'Pessoa fictícia · Angola' : m.location}</p>
      <Dot tone={m.verified ? 'green' : 'amber'} className="mt-[17px]">
        {m.verified ? `Perfil verificado${m.isDemo ? ' · exemplo' : ''}` : 'Perfil não verificado'}
      </Dot>
      <h4 className="mt-[19px] text-[16px] font-semibold leading-6">{m.specialty}</h4>
      <p className="mt-[19px] text-[13px] leading-5 text-muted">
        {m.languages.join(' · ')}
        <br />
        {m.modalities.join(' · ')}
        <br />
        {m.availability}
      </p>
      <p className="mt-[16px] text-[10px] uppercase leading-4 tracking-[0.02em] text-muted">Sessões a partir de</p>
      <p className="text-[22px] font-bold leading-7">{formatKz(m.priceFrom)}</p>
      <Link to={`/mentores/${m.slug}`} className="btn btn-block mt-4" aria-label={`Ver perfil de ${m.name}`}>
        Ver perfil
      </Link>
    </article>
  )
}
