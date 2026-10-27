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

const actions = ['Pedir esclarecimento ao mentor', 'Ocultar serviço temporariamente', 'Arquivar sem acção', 'Suspender perfil']

export default function AdminReportsPage() {
  useDocumentTitle('Denúncias de cursos e mentorias')
  const { data, loading, error, reload } = useAsync(() => adminService.reports(), [])
  const [draft, setDraft] = useState({ state: '', type: '' })
  const [applied, setApplied] = useState(draft)
  const [selected, setSelected] = useState('')
  const [action, setAction] = useState(actions[0])
  const [note, setNote] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)

  const rows = useMemo(() => (data ?? []).filter((r) => (!applied.state || r.state.startsWith(applied.state)) && (!applied.type || r.type === applied.type)), [data, applied])
  if (loading) return <Loading />
  if (error || !data) return <ErrorState message={error ?? 'Não foi possível carregar as denúncias.'} onRetry={reload} />
  const current = data.find((r) => r.id === selected) ?? data[0]
  const types = [...new Set(data.map((r) => r.type))]

  const filter = (e: FormEvent) => {
    e.preventDefault()
    setApplied(draft)
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!current) return
    if (!confirmed || note.trim().length < 5) return void toast.error('Indica a justificação e confirma a autorização.')
    setSaving(true)
    try {
      await adminService.decideReport(current.id, { action, note: note.trim() })
      toast.success('Decisão registada na auditoria.')
      setNote('')
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
        title="Denúncias de cursos e mentorias"
        subtitle="Cada denúncia é analisada por uma pessoa. Não há remoção automática de conteúdo."
      />
      <form onSubmit={filter} role="search" className="grid items-center gap-5 md:grid-cols-[1fr_1fr_auto]">
        <SelectField
          label="Estado"
          value={draft.state}
          onChange={(v) => setDraft({ ...draft, state: v })}
          options={['Por analisar', 'Em análise', 'Resolvida']}
          placeholder="Todos"
        />
        <SelectField label="Motivo" value={draft.type} onChange={(v) => setDraft({ ...draft, type: v })} options={types} placeholder="Todos" />
        <button type="submit" className="btn btn-primary">
          Filtrar
        </button>
      </form>
      {env.demoMode && (
        <Notice tone="info" title="Denúncias de demonstração" className="mt-[24px]">
          Os casos são fictícios e não identificam pessoas reais.
        </Notice>
      )}
      <div className="mt-[28px]">
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          empty="Nenhuma denúncia corresponde aos filtros."
          columns={[
            { header: 'Recurso', render: (r) => r.resource },
            { header: 'Motivo', render: (r) => r.type },
            { header: 'Recebida em', render: (r) => r.receivedAt },
            { header: 'Estado', render: (r) => r.state },
            {
              header: 'Acção',
              render: (r) => (
                <button type="button" className="hover:underline" onClick={() => setSelected(r.id)}>
                  {r.action}
                </button>
              ),
            },
          ]}
        />
      </div>
      {current && (
        <div className="mt-[28px] grid items-start gap-7 lg:grid-cols-2">
          <section className="card p-6 pb-[28px]">
            <h2 className="display text-[24px] leading-8">Detalhe · {current.resource}</h2>
            <Dot tone="amber" className="mt-[18px]">
              {current.state}
            </Dot>
            <dl className="mt-[18px] space-y-[14px] text-[15px]">
              <div>
                <dt className="small">Motivo indicado</dt>
                <dd>{current.type}</dd>
              </div>
              <div>
                <dt className="small">Recebida em</dt>
                <dd>{current.receivedAt}</dd>
              </div>
            </dl>
            <p className="small mt-[18px] text-[13px]">Os dados de quem denunciou não são mostrados ao mentor.</p>
          </section>
          <form onSubmit={submit} className="card p-6 pb-[28px]" noValidate>
            <h2 className="display text-[24px] leading-8">Acção de moderação</h2>
            <div className="mt-[18px] space-y-[16px]">
              <SelectField label="Acção" value={action} onChange={setAction} options={actions} />
              <TextAreaField label="Justificação" placeholder="Resumo visível na auditoria" value={note} onChange={(e) => setNote(e.target.value)} />
              <CheckField label="Confirmo que tenho autorização para esta acção." checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            </div>
            <button type="submit" className="btn btn-primary mt-[20px]" disabled={saving}>
              Registar acção
            </button>
          </form>
        </div>
      )}
    </>
  )
}
