import { Link, useParams } from 'react-router-dom'
import { mentorService } from '../../services/mentors'
import { useAsync } from '../../hooks/useAsync'
import { MentorVerification, ServiceCard } from '../../components/MentorCards'
import { WhatsAppButton } from '../../components/WhatsAppButton'
import { Badge, DemoBadge, EmptyState, ErrorState, Spinner } from '../../components/ui'

export default function MentorDetailPage() {
  const { id = '' } = useParams()
  const mentor = useAsync(() => mentorService.get(id), [id])
  const services = useAsync(() => mentorService.servicesOf(id), [id])

  if (mentor.loading) return <Spinner />
  if (mentor.error || !mentor.data) return <ErrorState message={mentor.error ?? 'Mentor não encontrado.'} onRetry={mentor.reload} />
  const m = mentor.data

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/mentores" className="text-sm text-brand-600 hover:underline">← Voltar aos mentores</Link>
      <section className="card space-y-4">
        <div className="flex items-center gap-4">
          {m.photoUrl ? (
            <img src={m.photoUrl} alt={`Fotografia de ${m.name}`} className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div aria-hidden className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">{m.name.charAt(0).toUpperCase()}</div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-brand-700">{m.name}</h1>
            <p className="text-slate-600">{m.headline}</p>
            <div className="mt-2 flex flex-wrap gap-2"><MentorVerification v={m.verification} />{m.isDemo && <DemoBadge />}</div>
          </div>
        </div>
        {m.verification !== 'verified' && (
          <p role="note" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Este perfil ainda não foi verificado. Tenha cuidado ao partilhar dados pessoais ou efectuar pagamentos.
          </p>
        )}
        <p className="whitespace-pre-line text-slate-700">{m.bio}</p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Experiência</dt><dd className="font-medium">{m.experience}</dd></div>
          <div><dt className="text-slate-500">Idiomas</dt><dd className="font-medium">{m.languages.join(', ')}</dd></div>
          <div><dt className="text-slate-500">Qualificações</dt><dd className="font-medium">{m.qualifications.join('; ')}</dd></div>
          <div><dt className="text-slate-500">Especialidades</dt><dd className="mt-1 flex flex-wrap gap-1">{m.specialties.map((s) => <Badge key={s} tone="blue">{s}</Badge>)}</dd></div>
        </dl>
        <WhatsAppButton number={m.whatsapp} authorized={m.whatsappPublic} serviceName={`Mentoria com ${m.name}`} />
      </section>
      <section>
        <h2 className="mb-3 text-xl font-bold text-brand-700">Serviços</h2>
        {services.loading ? <Spinner /> : services.error ? <ErrorState message={services.error} onRetry={services.reload} /> :
          services.data && services.data.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">{services.data.map((s) => <ServiceCard key={s.id} s={s} />)}</div>
          ) : <EmptyState title="Sem serviços publicados" />}
      </section>
    </div>
  )
}
