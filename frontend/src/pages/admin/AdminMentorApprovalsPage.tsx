import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { DataTable } from '../../components/ui/DataTable'
import { CheckField, SelectField, TextAreaField } from '../../components/ui/Field'
import { Dot, Notice } from '../../components/ui/Notice'
import { ErrorState, Loading } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'
import { env } from '../../lib/env'
import { getErrorMessage } from '../../lib/errors'
import { adminService } from '../../services'

const decisions = ['Aprovar perfil', 'Pedir mais informação', 'Rejeitar pedido']

export default function AdminMentorApprovalsPage() {
  useDocumentTitle('Aprovação de mentores')
  const { data, loading, error, reload } = useAsync(() => adminService.mentorReviews(), [])
  const [draft, setDraft] = useState({ state: '', specialty: '' })
  const [applied, setApplied] = useState(draft)
  const [selected, setSelected] = useState('')
  const [decision, setDecision] = useState(decisions[1])
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)

  const rows = useMemo(
    () => (data ?? []).filter((m) => (!applied.state || m.state.startsWith(applied.state)) && (!applied.specialty || m.specialty === applied.specialty)),
    [data, applied],
  )
  if (loading) return <Loading />
  if (error || !data) return <ErrorState message={error ?? 'Não foi possível carregar os pedidos.'} onRetry={reload} />
  const current = data.find((m) => m.id === selected) ?? data[0]
  const specialties = [...new Set(data.map((m) => m.specialty))]

  const filter = (e: FormEvent) => {
    e.preventDefault()
    setApplied(draft)
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!current) return
    if (!confirmed || reason.trim().length < 5) {
      toast.error('Indica o motivo e confirma que tens autorização para decidir.')
      return
    }
    setSaving(true)
    try {
      await adminService.decideMentor(current.id, { decision, reason: reason.trim() })
      toast.success('Decisão registada na auditoria.')
      setReason('')
      setConfirmed(false)
      reload()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DashHead
        eyebrow="Acesso restrito · Moderação"
        title="Aprovação de mentores"
        subtitle="Rever pedidos antes de um perfil ficar público. Sem verificação automática de identidade."
      />
      <form onSubmit={filter} role="search" className="grid items-center gap-5 md:grid-cols-[1fr_1fr_auto]">
        <SelectField
          label="Estado do pedido"
          value={draft.state}
          onChange={(v) => setDraft({ ...draft, state: v })}
          options={['Pendente', 'Em revisão', 'Rejeitada']}
          placeholder="Todos"
        />
        <SelectField label="Especialidade" value={draft.specialty} onChange={(v) => setDraft({ ...draft, specialty: v })} options={specialties} placeholder="Todas" />
        <button type="submit" className="btn btn-primary">
          Filtrar
        </button>
      </form>
      {env.demoMode && (
        <Notice tone="info" title="Fila de demonstração" className="mt-[24px]">
          Os pedidos abaixo são fictícios. Nenhum documento, contacto ou dado pessoal real é mostrado.
        </Notice>
      )}
      <div className="mt-[28px]">
        <DataTable
          rows={rows}
          rowKey={(m) => m.id}
          empty="Nenhum pedido corresponde aos filtros."
          columns={[
            { header: 'Mentor', render: (m) => m.name },
            { header: 'Especialidade', render: (m) => m.specialty },
            { header: 'Pedido em', render: (m) => m.requestedAt },
            { header: 'Estado', render: (m) => m.state },
            {
              header: 'Acção',
              render: (m) => (
                <button type="button" className="hover:underline" onClick={() => setSelected(m.id)}>
                  {m.action}
                </button>
              ),
            },
          ]}
        />
      </div>
      {current && (
        <div className="mt-[28px] grid items-start gap-7 lg:grid-cols-2">
          <section className="card p-6 pb-[28px]">
            <h2 className="display text-[24px] leading-8">Detalhe do pedido · {current.name}</h2>
            <Dot tone="amber" className="mt-[18px]">
              {current.state}
            </Dot>
            <dl className="mt-[18px] space-y-[14px] text-[15px]">
              <div>
                <dt className="small">Especialidade</dt>
                <dd>{current.specialty}</dd>
              </div>
              <div>
                <dt className="small">Pedido em</dt>
                <dd>{current.requestedAt}</dd>
              </div>
              <div>
                <dt className="small">A verificar</dt>
                <dd>Descrição do perfil, serviços propostos, preços e consentimento para contacto por WhatsApp.</dd>
              </div>
            </dl>
            <p className="small mt-[18px] text-[13px]">O contacto por WhatsApp só fica visível se o mentor o autorizar e o perfil for aprovado.</p>
          </section>
          <form onSubmit={submit} className="card p-6 pb-[28px]" noValidate>
            <h2 className="display text-[24px] leading-8">Registar decisão</h2>
            <div className="mt-[18px] space-y-[16px]">
              <SelectField label="Decisão" value={decision} onChange={setDecision} options={decisions} />
              <TextAreaField label="Motivo" placeholder="Justificação visível na auditoria" value={reason} onChange={(e) => setReason(e.target.value)} />
              <CheckField label="Confirmo que tenho autorização para esta decisão." checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            </div>
            <button type="submit" className="btn btn-primary mt-[20px]" disabled={saving}>
              Registar decisão
            </button>
          </form>
        </div>
      )}
    </>
  )
}
