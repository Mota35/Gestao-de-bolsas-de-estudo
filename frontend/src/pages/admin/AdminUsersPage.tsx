import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { CheckField, SelectField, TextField } from '../../components/ui/Field'
import { Dot, Notice } from '../../components/ui/Notice'
import { ErrorState, Loading } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'
import { env } from '../../lib/env'
import { getErrorMessage } from '../../lib/errors'
import { adminService } from '../../services'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const roles = ['Estudante', 'Mentor', 'Administrador']

export default function AdminUsersPage() {
  useDocumentTitle('Utilizadores e papéis')
  const { data, loading, error, reload } = useAsync(() => adminService.users(), [])
  const [draft, setDraft] = useState({ q: '', role: '', state: '' })
  const [applied, setApplied] = useState(draft)
  const [selected, setSelected] = useState<string>('')
  const [role, setRole] = useState('')
  const [access, setAccess] = useState('Activo')
  const [reason, setReason] = useState('')
  const [authorized, setAuthorized] = useState(false)
  const [suspend, setSuspend] = useState(false)
  const [saving, setSaving] = useState(false)

  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (u) =>
          (!applied.q || norm(u.name).includes(norm(applied.q))) && (!applied.role || u.role === applied.role) && (!applied.state || norm(u.state).startsWith(norm(applied.state))),
      ),
    [data, applied],
  )
  const user = data?.find((u) => u.id === selected) ?? data?.find((u) => u.name === 'Joana Tavares') ?? data?.[0]

  useEffect(() => {
    if (user) {
      setRole(user.role)
      setAccess(user.state.startsWith('Suspensa') ? 'Suspenso' : 'Activo')
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Loading />
  if (error || !data) return <ErrorState message={error ?? 'Não foi possível carregar os utilizadores.'} onRetry={reload} />

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setApplied(draft)
  }
  const save = async (nextAccess = access) => {
    if (!user) return
    if (!authorized || reason.trim().length < 5) {
      toast.error('Indica o motivo e confirma que tens autorização para esta alteração.')
      return
    }
    setSaving(true)
    try {
      await adminService.changeRole(user.id, { role, state: nextAccess, reason: reason.trim() })
      toast.success('Alteração registada na auditoria.')
      setReason('')
      setAuthorized(false)
      reload()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DashHead eyebrow="Acesso restrito" title="Utilizadores e papéis" subtitle="Dados mínimos para gerir acessos. Nenhum contacto privado é mostrado." />
      <form onSubmit={submit} role="search" className="grid items-center gap-5 md:grid-cols-[1.1fr_1fr_1fr_auto]">
        <TextField label="Pesquisar nome de apresentação" placeholder="Nome fictício" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} />
        <SelectField label="Papel" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} options={roles} placeholder="Todos os papéis" />
        <SelectField label="Estado da conta" value={draft.state} onChange={(v) => setDraft({ ...draft, state: v })} options={['Activa', 'Suspensa']} placeholder="Todos" />
        <button type="submit" className="btn btn-primary">
          Filtrar
        </button>
      </form>
      {env.demoMode && (
        <Notice tone="info" title="Ambiente de demonstração" className="mt-[24px]">
          Todas as pessoas são fictícias. Não são apresentados emails, telefones, documentos, senhas ou tokens.
        </Notice>
      )}

      <div className="mt-[28px]">
        <DataTable
          rows={rows}
          rowKey={(u) => u.id}
          empty="Nenhum utilizador corresponde aos filtros."
          columns={[
            { header: 'Nome', render: (u) => u.name },
            { header: 'Papel', render: (u) => u.role },
            { header: 'Estado', render: (u) => u.state },
            { header: 'Criado em', render: (u) => u.createdAt },
            {
              header: 'Acções',
              render: (u) => (
                <button type="button" className="hover:underline" onClick={() => setSelected(u.id)}>
                  {u.action}
                </button>
              ),
            },
          ]}
        />
      </div>

      {user && (
        <div className="mt-[28px] grid items-start gap-7 lg:grid-cols-[1fr_380px]">
          <section className="card p-6 pb-[28px]">
            <h2 className="display text-[24px] leading-8">Gerir papel · {user.name}</h2>
            <Dot tone="gray" className="mt-[18px]">
              {env.demoMode ? 'Selecção ilustrativa' : 'Utilizador seleccionado'}
            </Dot>
            <div className="mt-[18px] space-y-[16px]">
              <SelectField label="Papel atribuído" value={role} onChange={setRole} options={roles} />
              <SelectField label="Estado de acesso" value={access} onChange={setAccess} options={['Activo', 'Suspenso']} />
              <TextField label="Motivo da alteração" placeholder="Descreve a justificação autorizada" value={reason} onChange={(e) => setReason(e.target.value)} />
              <CheckField label="Confirmo que tenho autorização para esta alteração." checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
            </div>
            <div className="mt-[20px] flex flex-wrap gap-3">
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => save()}>
                Guardar alteração
              </button>
              <button type="button" className="btn" disabled={saving} onClick={() => setSuspend(true)}>
                Suspender acesso
              </button>
            </div>
          </section>
          <section className="card p-6 pb-[24px]">
            <h2 className="display text-[24px] leading-8">Regras de acesso</h2>
            <p className="mt-[22px] text-[15.5px] leading-[21px] text-muted">
              Estudantes gerem os próprios dados. Mentores gerem os próprios perfis e serviços. A administração exige autorização específica.
            </p>
            <hr className="my-[20px] border-0 border-t border-line" />
            <p className="text-[15.5px] leading-[21px] text-muted">
              Alterações de papel, suspensão e reactivação devem ter motivo e registo na auditoria. Não elevamos permissões automaticamente.
            </p>
            <Link to="/admin/auditoria" className="btn btn-block mt-[18px]">
              Ver auditoria autorizada
            </Link>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={suspend}
        title={`Suspender o acesso de ${user?.name ?? ''}?`}
        confirmLabel="Suspender"
        onCancel={() => setSuspend(false)}
        onConfirm={() => {
          setSuspend(false)
          setAccess('Suspenso')
          void save('Suspenso')
        }}
      >
        A pessoa deixa de conseguir iniciar sessão. A acção exige motivo e fica registada na auditoria.
      </ConfirmDialog>
    </>
  )
}
