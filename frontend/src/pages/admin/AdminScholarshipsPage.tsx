import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { CheckField, SelectField, TextField } from '../../components/ui/Field'
import { Dot, Notice } from '../../components/ui/Notice'
import { ErrorState, Loading } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'
import { getErrorMessage } from '../../lib/errors'
import { formatDate, callStatus } from '../../lib/format'
import { referenceDate } from '../../lib/env'
import { adminService } from '../../services'
import type { AdminScholarshipRow } from '../../types/area'

export default function AdminScholarshipsPage() {
  useDocumentTitle('Gestão de bolsas')
  const { data, loading, error, reload } = useAsync(() => adminService.scholarships(), [])
  const [draft, setDraft] = useState({ verification: '', state: '' })
  const [applied, setApplied] = useState(draft)
  const [selected, setSelected] = useState('')
  const [deadline, setDeadline] = useState('')
  const [sourceChecked, setSourceChecked] = useState(false)
  const [deactivate, setDeactivate] = useState<AdminScholarshipRow | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) return <Loading />
  if (error || !data) return <ErrorState message={error ?? 'Não foi possível carregar as bolsas.'} onRetry={reload} />
  const rows = data.filter((s) => (!applied.verification || s.verification === applied.verification) && (!applied.state || (applied.state === 'activa') === s.active))
  const current = data.find((s) => s.id === selected) ?? data.find((s) => s.title === 'Programa Pontes') ?? data[0]
  const refLabel = formatDate(referenceDate().toISOString().slice(0, 10))

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try {
      await fn()
      toast.success(ok)
      reload()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  const filter = (e: FormEvent) => {
    e.preventDefault()
    setApplied(draft)
  }
  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!current) return
    if (!sourceChecked) return void toast.error('Confirma que a fonte oficial foi consultada.')
    void run(() => adminService.saveScholarship(current.id, { deadline: deadline || current.deadline, sourceChecked }), 'Bolsa guardada.')
  }

  return (
    <>
      <DashHead eyebrow="Acesso restrito · Editorial" title="Gestão de bolsas" subtitle="Rever fontes, prazos e estados. Bolsas expiradas nunca aparecem como abertas." />
      <form onSubmit={filter} role="search" className="grid items-center gap-5 md:grid-cols-[1fr_1fr_auto]">
        <SelectField
          label="Verificação"
          value={draft.verification}
          onChange={(v) => setDraft({ ...draft, verification: v })}
          options={['verificada', 'pendente']}
          placeholder="Todas"
        />
        <SelectField
          label="Estado"
          value={draft.state}
          onChange={(v) => setDraft({ ...draft, state: v })}
          options={[
            { value: 'activa', label: 'Activa' },
            { value: 'inactiva', label: 'Desactivada' },
          ]}
          placeholder="Todos"
        />
        <button type="submit" className="btn btn-primary">
          Filtrar
        </button>
      </form>
      <Notice tone="warn" title={`Data de referência: ${refLabel}`} className="mt-[24px]">
        O estado aberto ou expirado é calculado a partir do prazo. Revê sempre a fonte oficial antes de verificar uma bolsa.
      </Notice>
      <div className="mt-[28px]">
        <DataTable
          rows={rows}
          rowKey={(s) => s.id}
          empty="Nenhuma bolsa corresponde aos filtros."
          columns={[
            { header: 'Bolsa', render: (s) => s.title },
            { header: 'Prazo', render: (s) => `${formatDate(s.deadline)}${callStatus(s.deadline) === 'expirada' ? ' · expirada' : ''}` },
            { header: 'Verificação', render: (s) => (s.verification === 'verificada' ? 'Verificada' : 'Pendente') },
            {
              header: 'Acções',
              render: (s) => (
                <span>
                  <button type="button" className="hover:underline" onClick={() => setSelected(s.id)}>
                    Editar
                  </button>
                  {' · '}
                  {s.active ? (
                    <button type="button" className="hover:underline" onClick={() => setDeactivate(s)}>
                      Desactivar
                    </button>
                  ) : (
                    <span className="text-muted">Desactivada</span>
                  )}
                  {s.verification === 'pendente' && (
                    <>
                      {' · '}
                      <button type="button" className="hover:underline" disabled={busy} onClick={() => void run(() => adminService.verifyScholarship(s.id), 'Bolsa verificada.')}>
                        Verificar
                      </button>
                    </>
                  )}
                </span>
              ),
            },
          ]}
        />
      </div>
      {current && (
        <div className="mt-[28px] grid items-start gap-7 lg:grid-cols-[1fr_380px]">
          <form onSubmit={save} className="card p-6 pb-[28px]" noValidate>
            <h2 className="display text-[24px] leading-8">Editar · {current.title}</h2>
            <div className="mt-[18px] space-y-[16px]">
              <TextField label="Prazo" type="date" value={deadline || current.deadline} onChange={(e) => setDeadline(e.target.value)} />
              <CheckField label="Confirmo que consultei a fonte oficial." checked={sourceChecked} onChange={(e) => setSourceChecked(e.target.checked)} />
            </div>
            <button type="submit" className="btn btn-primary mt-[20px]" disabled={busy}>
              Guardar alterações
            </button>
          </form>
          <section className="card p-6 pb-[24px]">
            <h2 className="display text-[24px] leading-8">Revisão da fonte</h2>
            <Dot tone={current.verification === 'verificada' ? 'green' : 'amber'} className="mt-[18px]">
              {current.verification === 'verificada' ? 'Fonte verificada' : 'Fonte por rever'}
            </Dot>
            <p className="mt-[18px] text-[15px] leading-[21px] text-muted">
              Não publicamos ligações de candidatura sem fonte oficial confirmada. Em caso de dúvida, mantém a bolsa como pendente.
            </p>
          </section>
        </div>
      )}
      <ConfirmDialog
        open={deactivate !== null}
        title={`Desactivar ${deactivate?.title ?? 'bolsa'}?`}
        confirmLabel="Desactivar"
        onCancel={() => setDeactivate(null)}
        onConfirm={() => {
          const s = deactivate
          setDeactivate(null)
          if (s) void run(() => adminService.deactivateScholarship(s.id), 'Bolsa desactivada.')
        }}
      >
        A bolsa deixa de aparecer no catálogo público. A acção fica registada na auditoria.
      </ConfirmDialog>
    </>
  )
}
