import { useMemo, useState, type FormEvent } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { SelectField } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'
import { ErrorState, Loading } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'
import { env } from '../../lib/env'
import { adminService } from '../../services'

export default function AdminAuditPage() {
  useDocumentTitle('Auditoria autorizada')
  const { data, loading, error, reload } = useAsync(() => adminService.audit(), [])
  const [draft, setDraft] = useState({ day: '', user: '', action: '' })
  const [applied, setApplied] = useState(draft)
  const [selected, setSelected] = useState('')

  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (a) => (!applied.day || a.when.startsWith(applied.day)) && (!applied.user || a.user[0] === applied.user) && (!applied.action || a.action === applied.action),
      ),
    [data, applied],
  )
  if (loading) return <Loading />
  if (error || !data) return <ErrorState message={error ?? 'Não foi possível carregar a auditoria.'} onRetry={reload} />
  const current = data.find((a) => a.id === selected) ?? data[0]
  const days = [...new Set(data.map((a) => a.when.split(' · ')[0]))]
  const users = [...new Set(data.map((a) => a.user[0]))]
  const actions = [...new Set(data.map((a) => a.action))]

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setApplied(draft)
  }

  return (
    <>
      <DashHead eyebrow="Acesso restrito · Auditoria" title="Auditoria autorizada" subtitle="Registo de acções administrativas. Sem dados pessoais desnecessários." />
      <form onSubmit={submit} role="search" className="grid items-center gap-5 md:grid-cols-[1fr_1fr_1fr_auto]">
        <SelectField label="Período" value={draft.day} onChange={(v) => setDraft({ ...draft, day: v })} options={days} placeholder="Todos" />
        <SelectField label="Utilizador" value={draft.user} onChange={(v) => setDraft({ ...draft, user: v })} options={users} placeholder="Todos" />
        <SelectField label="Acção" value={draft.action} onChange={(v) => setDraft({ ...draft, action: v })} options={actions} placeholder="Todas" />
        <button type="submit" className="btn btn-primary">
          Consultar
        </button>
      </form>
      {env.demoMode && (
        <Notice tone="info" title="Registos de demonstração" className="mt-[24px]">
          Os eventos abaixo são fictícios. A consulta real exige autorização e fica ela própria registada.
        </Notice>
      )}
      <div className="mt-[28px]">
        <DataTable
          rows={rows}
          rowKey={(a) => a.id}
          empty="Nenhum registo corresponde aos filtros."
          columns={[
            { header: 'Data', render: (a) => a.when },
            { header: 'Acção', render: (a) => a.action },
            {
              header: 'Utilizador',
              render: (a) => (
                <>
                  {a.user[0]}
                  {a.user[1] && <span className="small block">{a.user[1]}</span>}
                </>
              ),
            },
            { header: 'Recurso', render: (a) => a.resource },
            {
              header: 'Resultado',
              render: (a) => (
                <button type="button" className="text-left hover:underline" onClick={() => setSelected(a.id)}>
                  {a.result}
                </button>
              ),
            },
          ]}
        />
      </div>
      {current && (
        <div className="mt-[28px] grid items-start gap-7 lg:grid-cols-2">
          <section className="card p-6 pb-[28px]">
            <h2 className="display text-[24px] leading-8">Detalhe · {current.action.toLowerCase()}</h2>
            <dl className="mt-[18px] space-y-[14px] text-[15px]">
              <div>
                <dt className="small">Data</dt>
                <dd>{current.when}</dd>
              </div>
              <div>
                <dt className="small">Utilizador</dt>
                <dd>{current.user.join(' · ')}</dd>
              </div>
              <div>
                <dt className="small">Recurso</dt>
                <dd>{current.resource}</dd>
              </div>
              <div>
                <dt className="small">Resultado</dt>
                <dd>{current.result}</dd>
              </div>
            </dl>
          </section>
          <section className="card p-6 pb-[28px]">
            <h2 className="display text-[24px] leading-8">Consulta responsável</h2>
            <p className="mt-[18px] text-[15px] leading-[21px] text-muted">
              Consulta apenas o necessário para a tua função. Não copies registos para fora da plataforma nem partilhes dados pessoais.
            </p>
            <p className="mt-[14px] text-[15px] leading-[21px] text-muted">Os registos não incluem senhas, tokens nem contactos privados.</p>
          </section>
        </div>
      )}
    </>
  )
}
