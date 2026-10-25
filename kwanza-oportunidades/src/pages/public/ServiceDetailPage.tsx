import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Flag } from 'lucide-react'
import { courseService, mentorService } from '../../services/mentors'
import { errorMessage } from '../../services/api'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../contexts/AuthContext'
import { MentorVerification } from '../../components/MentorCards'
import { WhatsAppButton } from '../../components/WhatsAppButton'
import { Badge, DemoBadge, ErrorState, Spinner, TextAreaField } from '../../components/ui'
import { formatPrice } from '../../utils/format'

export default function ServiceDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const svc = useAsync(() => courseService.get(id), [id])
  const mentor = useAsync(async () => (svc.data ? mentorService.get(svc.data.mentorId) : null), [svc.data?.mentorId])
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)

  if (svc.loading) return <Spinner />
  if (svc.error || !svc.data) return <ErrorState message={svc.error ?? 'Serviço não encontrado.'} onRetry={svc.reload} />
  const s = svc.data
  const m = mentor.data

  async function sendReport() {
    if (reason.trim().length < 10) {
      toast.error('Descreva o motivo com pelo menos 10 caracteres.')
      return
    }
    setSending(true)
    try {
      await courseService.report(s.id, reason.trim())
      toast.success('Denúncia enviada. Obrigado.')
      setReporting(false)
      setReason('')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/cursos" className="text-sm text-brand-600 hover:underline">← Voltar aos cursos e mentorias</Link>
      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="blue">{s.kind === 'course' ? 'Curso' : 'Mentoria'}</Badge>
          <Badge>{s.mode === 'online' ? 'Online' : 'Presencial'}</Badge>
          {m && <MentorVerification v={m.verification} />}
          {s.isDemo && <DemoBadge />}
        </div>
        <h1 className="text-2xl font-bold text-brand-700">{s.title}</h1>
        {m && <p className="text-sm text-slate-600">Mentor: <Link className="font-medium text-brand-600 hover:underline" to={`/mentores/${m.id}`}>{m.name}</Link></p>}
        <p className="whitespace-pre-line text-slate-700">{s.description}</p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Preço</dt><dd className="font-semibold">{formatPrice(s.price, s.currency)}</dd></div>
          <div><dt className="text-slate-500">Disponibilidade</dt><dd className="font-medium">{s.availability}</dd></div>
        </dl>
        {m && <WhatsAppButton number={m.whatsapp} authorized={m.whatsappPublic} serviceName={s.title} />}
        {user && (
          <div className="border-t border-slate-200 pt-4">
            {!reporting ? (
              <button type="button" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600" onClick={() => setReporting(true)}>
                <Flag className="h-4 w-4" aria-hidden /> Denunciar este serviço
              </button>
            ) : (
              <div className="space-y-2">
                <TextAreaField label="Motivo da denúncia" value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex gap-2">
                  <button type="button" className="btn-danger" disabled={sending} onClick={() => void sendReport()}>Enviar denúncia</button>
                  <button type="button" className="btn-outline" onClick={() => setReporting(false)}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
