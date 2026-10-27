import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ServiceCard } from '../../components/ServiceCard'
import { WhatsAppButton } from '../../components/WhatsAppButton'
import { CheckList } from '../../components/ui/CheckList'
import { TextAreaField } from '../../components/ui/Field'
import { Dot, Notice } from '../../components/ui/Notice'
import { Breadcrumb } from '../../components/ui/PageHeader'
import { ErrorState, Loading } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { env } from '../../lib/env'
import { getErrorMessage } from '../../lib/errors'
import { courseService, mentorService } from '../../services'
import type { Mentor } from '../../types'

function ReportProfile({ mentor }: { mentor: Mentor }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const send = async () => {
    if (reason.trim().length < 10) {
      toast.error('Descreve brevemente o motivo (mínimo 10 caracteres).')
      return
    }
    setSending(true)
    try {
      await courseService.report({ target: `mentor:${mentor.slug}`, reason: reason.trim() })
      toast.success('Denúncia recebida. A equipa vai analisar o contexto.')
      setReason('')
      setOpen(false)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSending(false)
    }
  }
  return (
    <div className="mt-[28px]">
      <button type="button" className="btn btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Denunciar este perfil
      </button>
      {open && (
        <div className="card mt-4 max-w-[560px] p-5">
          <TextAreaField label="Motivo da denúncia" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Não incluas dados pessoais de terceiros." />
          <div className="mt-4 flex gap-3">
            <button type="button" className="btn btn-sm btn-primary" onClick={send} disabled={sending}>
              {sending ? 'A enviar…' : 'Enviar denúncia'}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Profile({ m }: { m: Mentor }) {
  useDocumentTitle(m.name)
  const demo = env.demoMode && m.isDemo
  const firstName = m.name.split(' ')[0]
  const verifiedLabel = m.verified ? `Perfil verificado${demo ? ' · demonstração' : ''}` : 'Perfil não verificado'
  const cta = m.whatsappAllowed
  return (
    <div className="bg-page pb-[44px]">
      <div className="wrap pt-[40px]">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mentores', to: '/mentores' }, { label: m.name }]} />

        <section className="mt-[24px] grid items-start gap-10 md:grid-cols-[350px_1fr]">
          {m.photo ? (
            <img
              src={m.photo}
              alt={`Retrato de ${m.name}${demo ? ' (imagem ilustrativa)' : ''}`}
              className="aspect-square w-full rounded-2xl object-cover max-md:aspect-[342/300]"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-mint text-[64px] font-bold text-green" aria-hidden>
              {m.name
                .split(' ')
                .map((w) => w[0])
                .slice(0, 2)
                .join('')}
            </div>
          )}
          <div>
            <Dot tone={m.verified ? 'green' : 'amber'}>{verifiedLabel}</Dot>
            <h1 className="display mt-[17px] text-[44px] leading-[52px] max-sm:text-[36px] max-sm:leading-[44px]">{m.name}</h1>
            <h2 className="mt-[17px] text-[24px] font-normal leading-8 text-ink">{m.headline}</h2>
            <p className="mt-[19px] text-[17px] leading-6 text-muted">
              {m.location} · {m.languages.join(' e ')}
              <br />
              {m.modalities.join(' e ')} · {m.availability.replace('Disponível em ', 'Disponível em ')}
              {m.availability.startsWith('Disponível em ') && !/\d{4}/.test(m.availability) ? ' de 2026' : ''}
            </p>
            <p className="mt-[19px] flex flex-wrap gap-x-4 gap-y-2">
              {m.tags.map((t) => (
                <Dot key={t} tone="gray">
                  {t}
                </Dot>
              ))}
            </p>
            {cta && (
              <div className="mt-[17px]">
                <WhatsAppButton number={m.whatsapp} serviceTitle={`o perfil de ${m.name}`} authorized variant="primary" icon className="max-sm:w-full" />
              </div>
            )}
            <p className="small mt-[18px] text-[13px]">
              {cta
                ? demo
                  ? 'Divulgação autorizada neste perfil fictício. Sem número público nem ligação activa.'
                  : 'Contacto divulgado com autorização do mentor.'
                : 'Este mentor não autorizou a divulgação do contacto por WhatsApp.'}
            </p>
          </div>
        </section>

        {demo && (
          <Notice tone="info" title="Perfil e qualificações ilustrativos" className="mt-[28px]">
            Esta pessoa é fictícia. O estado de verificação representa apenas o design. Nenhum pagamento garante verificação ou atribuição de bolsa.
          </Notice>
        )}
        {!m.verified && !demo && (
          <Notice tone="warn" title="Perfil não verificado" className="mt-[28px]">
            A plataforma ainda não concluiu a revisão deste perfil. Confirma as qualificações e as condições antes de pagar.
          </Notice>
        )}

        <div className="mt-[28px] grid items-start gap-7 lg:grid-cols-[1fr_350px]">
          <div className="space-y-[24px]">
            <section className="card p-6 pb-[28px]">
              <h2 className="display text-[24px] leading-8">Uma orientação próxima, do início ao envio</h2>
              <div className="mt-[19px] space-y-[16px]">
                {m.bio.map((p) => (
                  <p key={p} className="text-[16px] leading-6 text-muted">
                    {p}
                  </p>
                ))}
              </div>
            </section>
            <section className="card p-6 pb-[26px]">
              <h2 className="display text-[24px] leading-8">Experiência e qualificações</h2>
              <CheckList className="mt-[19px]" items={m.qualifications} />
            </section>
          </div>

          <aside className="card p-6 pb-[24px]">
            <h2 className="display text-[22px] leading-8">{demo ? 'Disponibilidade de exemplo' : 'Disponibilidade'}</h2>
            <div className="mt-[22px] space-y-[24px] text-[14.5px] leading-[21px]">
              {m.schedule.map((s) => (
                <p key={s} className="whitespace-pre-line">
                  {s}
                </p>
              ))}
            </div>
            <Dot tone="gray" className="mt-[24px]">
              {m.availability.replace('Disponível em novembro', 'Novembro de 2026').replace('Disponível em dezembro', 'Dezembro de 2026')}
            </Dot>
            <p className="mt-[22px] text-[13px] leading-5 text-muted">
              Confirma o horário e as condições directamente com {m.name.endsWith('a') || firstName.endsWith('a') ? 'a mentora' : 'o mentor'} antes de pagar.
            </p>
            {cta ? (
              <div className="mt-[18px]">
                <WhatsAppButton number={m.whatsapp} serviceTitle={`o perfil de ${m.name}`} authorized className="btn-block" />
              </div>
            ) : (
              <Link to="/contactos" className="btn btn-block mt-[18px]">
                Pedir informações ao suporte
              </Link>
            )}
          </aside>
        </div>

        <section className="mt-[36px]" aria-labelledby="servicos">
          <h2 id="servicos" className="h-page text-[30px] leading-9">
            Serviços e mentorias
          </h2>
          <p className="mt-0.5 text-[15px] text-muted">
            Preços em kwanza (AOA), definidos {m.name.endsWith('a') ? 'pela mentora' : 'pelo mentor'}. Não incluem taxas de candidatura.
          </p>
          <div className="mt-[28px] grid items-start gap-6 md:grid-cols-3">
            {m.services.map((s) => (
              <ServiceCard key={s.id} s={s} />
            ))}
          </div>
        </section>

        <Notice tone="warn" title="Escolhe com segurança" className="mt-[28px]">
          Não partilhes documentos sensíveis no primeiro contacto. Confirma identidade, preço, política de cancelamento e forma de pagamento. Nenhuma mentoria garante uma bolsa.
        </Notice>
        <ReportProfile mentor={m} />
      </div>
    </div>
  )
}

export default function MentorDetailPage() {
  const { slug = '' } = useParams()
  const { data, loading, error, reload } = useAsync(() => mentorService.get(slug), [slug])
  useDocumentTitle(data?.name ?? 'Mentor')
  if (loading) return <Loading label="A carregar o perfil…" />
  if (error || !data) {
    return (
      <div className="wrap py-16">
        <ErrorState message={error ?? 'Não encontrámos este perfil.'} onRetry={reload} />
        <Link to="/mentores" className="btn mt-6">
          Ver todos os mentores
        </Link>
      </div>
    )
  }
  return <Profile m={data} />
}
