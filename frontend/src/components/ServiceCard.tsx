import { Link } from 'react-router-dom'
import { formatKz } from '../lib/format'
import type { MentorService } from '../types'
import { WhatsAppButton } from './WhatsAppButton'

export function ServiceCard({ s, showMentorLine = true, className = '' }: { s: MentorService; showMentorLine?: boolean; className?: string }) {
  const tone = s.mentorVerified ? 'text-green' : 'text-amber'
  const where = s.modality === 'presencial' ? `Presencial${s.location ? ` · ${s.location}` : ''}` : 'Online'
  return (
    <article className={`card flex flex-col p-6 pb-[23px] ${className}`}>
      <p className={`text-[11px] font-bold uppercase leading-[17px] tracking-[0.01em] ${tone}`}>{s.kind === 'curso' ? 'Curso em grupo' : 'Mentoria individual'}</p>
      <p className={`text-[11px] font-bold leading-[17px] ${tone}`}>{s.mentorVerified ? 'Mentor verificado · exemplo' : 'Mentor não verificado'}</p>
      <h3 className="mt-[19px] text-[21px] font-semibold leading-7 tracking-tight">{s.title}</h3>
      {showMentorLine && <p className="text-[12px] leading-[17px] text-muted">{s.mentorName} · Pessoa fictícia</p>}
      <p className="mt-[19px] text-[13px] leading-5">
        {where} · {s.duration}
        <br />
        Disponibilidade: {s.availability}
      </p>
      <p className="mt-[19px] text-[28px] font-bold leading-9">
        {formatKz(s.price)} <span className="text-[12px] font-normal text-muted">(AOA)</span>
      </p>
      <p className="text-[12px] leading-[17px] text-muted">
        Valor de exemplo. Condições acordadas directamente com o mentor.{!s.whatsappAllowed && ' WhatsApp não autorizado para divulgação.'}
      </p>
      <div className="mt-[18px]">
        {s.whatsappAllowed ? (
          <WhatsAppButton number={s.whatsapp} serviceTitle={s.title} authorized className="btn-block" />
        ) : (
          <Link to={`/mentores/${s.mentorSlug}`} className="btn btn-block">
            Consultar disponibilidade
          </Link>
        )}
      </div>
    </article>
  )
}
