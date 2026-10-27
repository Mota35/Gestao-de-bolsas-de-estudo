import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { SelectField } from '../../components/ui/Field'
import { Dot, Notice } from '../../components/ui/Notice'
import { ErrorState, Loading } from '../../components/ui/States'
import { useAuth } from '../../contexts/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'
import { env } from '../../lib/env'
import { getErrorMessage } from '../../lib/errors'
import { formatKz } from '../../lib/format'
import { mentorAreaService } from '../../services'
import type { MentorServiceDraft } from '../../types/area'

const stateLabel = { publicado: 'Publicado', rascunho: 'Rascunho', desactivado: 'Desactivado' } as const

function availabilityOf(s: MentorServiceDraft) {
  if (s.state === 'desactivado') return 'Sem horários activos'
  if (!s.availability) return 'Por definir'
  return s.availability.split(' · ')[0]
}

function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="card p-6 pb-[22px]">
      <p className="text-[14px] text-muted">{label}</p>
      <p className="mt-[13px] text-[36px] font-light leading-9">{value}</p>
      <p className="mt-[3px] text-[12px] text-green">{hint}</p>
    </div>
  )
}

export default function MentorDashboardPage() {
  useDocumentTitle('Painel e serviços')
  const { user } = useAuth()
  const overview = useAsync(() => mentorAreaService.overview(), [])
  const profile = useAsync(() => mentorAreaService.profile(), [])
  const [toDisable, setToDisable] = useState<MentorServiceDraft | null>(null)

  if (overview.loading || profile.loading) return <Loading />
  if (overview.error || !overview.data) return <ErrorState message={overview.error ?? 'Não foi possível carregar o painel.'} onRetry={overview.reload} />
  const o = overview.data
  const p = profile.data
  const first = (p?.name ?? user?.name ?? '').split(' ')[0]

  const change = async (s: MentorServiceDraft, state: MentorServiceDraft['state']) => {
    try {
      await mentorAreaService.setState(s.id!, state)
      toast.success(state === 'publicado' ? 'Serviço publicado.' : 'Serviço desactivado.')
      overview.reload()
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <>
      <DashHead
        eyebrow="Área profissional"
        title={`Olá, ${first}. O teu conhecimento tem lugar aqui.`}
        subtitle="Gere os teus serviços, horários e condições com clareza."
        action={
          <Link to="/mentor/servicos/novo" className="btn">
            Criar serviço
          </Link>
        }
      />

      {p?.verification !== 'verificado' && (
        <Notice tone="warn" title={p?.verification === 'rejeitado' ? 'Verificação do perfil não aprovada' : 'Verificação do perfil pendente'} className="!py-[20px]">
          O teu perfil profissional ainda está em análise. Pagar ou publicar serviços não atribui verificação.{env.demoMode ? ' Este painel usa dados fictícios.' : ''}
        </Notice>
      )}

      <div className="mt-[28px] grid gap-5 md:grid-cols-3">
        <StatCard label="Serviços publicados" value={o.published} hint="Estado de exemplo" />
        <StatCard label="Rascunhos" value={o.drafts} hint="Ainda não visíveis ao público" />
        <StatCard label="Desactivados" value={o.disabled} hint="Podes rever antes de publicar" />
      </div>

      <div className="mb-[28px] mt-[40px]">
        <h2 className="h-page text-[30px] leading-9">Os teus serviços</h2>
        <p className="text-[15px] leading-5 text-muted">Os estados de publicação são independentes da verificação profissional.</p>
      </div>
      <DataTable
        rows={o.services}
        rowKey={(s) => s.id ?? s.title}
        empty="Ainda não criaste nenhum serviço."
        columns={[
          { header: 'Serviço', width: '270px', render: (s) => s.title },
          {
            header: 'Preço e modalidade',
            width: '200px',
            render: (s) => (
              <>
                {formatKz(s.price)} / AOA
                <br />
                {s.modality === 'online' ? 'Online' : s.place || 'Presencial'} · {s.duration.replace(' minutos por sessão', ' min').replace(' minutos', ' min')}
              </>
            ),
          },
          { header: 'Disponibilidade', width: '175px', render: (s) => availabilityOf(s) },
          { header: 'Estado', width: '140px', render: (s) => stateLabel[s.state] },
          {
            header: 'Acções',
            width: '1fr',
            render: (s) => (
              <>
                <Link to={`/mentor/servicos/${s.id}`} className="hover:underline">
                  Editar
                </Link>
                {' · '}
                {s.state === 'publicado' ? (
                  <button type="button" className="hover:underline" onClick={() => setToDisable(s)}>
                    Desactivar
                  </button>
                ) : (
                  <button type="button" className="hover:underline" onClick={() => change(s, 'publicado')}>
                    Publicar
                  </button>
                )}
              </>
            ),
          },
        ]}
      />

      <div className="mt-[28px] grid items-start gap-6 md:grid-cols-2">
        <section className="card p-6 pb-[24px]">
          <h2 className="display text-[24px] leading-8">Disponibilidade de atendimento</h2>
          <div className="mt-[22px]">
            <SelectField label="Período" value={o.availabilityPeriod} onChange={() => undefined} options={[o.availabilityPeriod]} hint={undefined} disabled />
          </div>
          <p className="mt-[16px] text-[15.5px] leading-[21px]">
            {o.schedule.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </p>
          <Link to="/mentor/disponibilidade" className="btn mt-[22px]">
            Editar disponibilidade
          </Link>
        </section>
        <section className="card p-6 pb-[24px]">
          <h2 className="display text-[24px] leading-8">O teu perfil e o contacto público</h2>
          <Dot tone="gray" className="mt-[16px]">
            {p?.whatsappConsent ? 'WhatsApp divulgado' : 'WhatsApp não divulgado'}
          </Dot>
          <p className="mt-[16px] text-[15.5px] leading-[21px] text-muted">
            {p?.whatsappConsent ? 'O consentimento de divulgação está activo.' : 'O consentimento de divulgação está desligado neste painel.'} O botão de contacto só aparece no
            perfil e nos serviços autorizados.
          </p>
          <Link to="/mentor/perfil" className="btn mt-[16px]">
            Rever perfil profissional
          </Link>
          {env.demoMode && (
            <p className="small mt-[16px] text-[13px]">
              O perfil público de exemplo mostra uma alternativa autorizada e verificada. Aqui está representado o estado pendente de edição.
            </p>
          )}
        </section>
      </div>
      {env.demoMode && <p className="small mt-[28px] text-[13px]">Ambiente de demonstração: as alterações só existem durante esta sessão.</p>}

      <ConfirmDialog
        open={!!toDisable}
        title="Desactivar este serviço?"
        confirmLabel="Desactivar"
        onCancel={() => setToDisable(null)}
        onConfirm={() => {
          const s = toDisable
          setToDisable(null)
          if (s) void change(s, 'desactivado')
        }}
      >
        O serviço deixa de estar visível ao público. Podes voltar a publicá-lo mais tarde.
      </ConfirmDialog>
    </>
  )
}
