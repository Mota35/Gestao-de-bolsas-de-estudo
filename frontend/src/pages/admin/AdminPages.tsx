import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { adminService } from '../../services/admin'
import { errorMessage } from '../../services/api'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../contexts/AuthContext'
import { scholarshipAdminSchema, type ScholarshipAdminInput } from '../../schemas'
import { Badge, ConfirmDialog, EmptyState, ErrorState, PageHeader, SelectField, Spinner, TextAreaField, TextField } from '../../components/ui'
import { MentorVerification } from '../../components/MentorCards'
import { StatusBadge, VerificationBadge } from '../../components/ScholarshipCard'
import { formatDate, formatPrice } from '../../utils/format'
import type { Role, Scholarship } from '../../types'

function Load<T>({ state, children, empty }: { state: { data: T | null; loading: boolean; error: string | null; reload: () => void }; children: (d: T) => ReactNode; empty?: (d: T) => boolean }) {
  if (state.loading) return <Spinner />
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />
  if (!state.data || (empty && empty(state.data))) return <EmptyState title="Sem registos" />
  return <>{children(state.data)}</>
}

export function AdminUsersPage() {
  const { user: me } = useAuth()
  const state = useAsync(() => adminService.users(), [])
  const [pending, setPending] = useState<{ id: string; name: string; active: boolean } | null>(null)

  async function changeRole(id: string, role: Role) {
    try {
      await adminService.setRole(id, role)
      toast.success('Papel actualizado.')
      state.reload()
    } catch (e) { toast.error(errorMessage(e)) }
  }
  async function confirmToggle() {
    if (!pending) return
    try {
      await adminService.setActive(pending.id, !pending.active)
      toast.success(pending.active ? 'Utilizador desactivado.' : 'Utilizador reactivado.')
      state.reload()
    } catch (e) { toast.error(errorMessage(e)) } finally { setPending(null) }
  }

  return (
    <>
      <PageHeader title="Utilizadores e papéis" />
      <Load state={state} empty={(d) => d.length === 0}>
        {(users) => (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Nome</th><th className="p-3">Email</th><th className="p-3">Papel</th><th className="p-3">Estado</th><th className="p-3" /></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-200">
                    <td className="p-3">{u.name}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">
                      <label className="sr-only" htmlFor={`role-${u.id}`}>Papel de {u.name}</label>
                      <select id={`role-${u.id}`} className="input py-1" value={u.role} disabled={u.id === me?.id} onChange={(e) => void changeRole(u.id, e.target.value as Role)}>
                        <option value="student">Estudante</option><option value="mentor">Mentor</option><option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td className="p-3"><Badge tone={u.active ? 'green' : 'red'}>{u.active ? 'Activo' : 'Desactivado'}</Badge></td>
                    <td className="p-3 text-right">
                      <button type="button" className="btn-outline" disabled={u.id === me?.id} onClick={() => setPending({ id: u.id, name: u.name, active: u.active })}>{u.active ? 'Desactivar' : 'Reactivar'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Load>
      <ConfirmDialog open={!!pending} title={pending?.active ? 'Desactivar utilizador' : 'Reactivar utilizador'} message={`Confirma a alteração do estado de ${pending?.name ?? ''}?`} danger={!!pending?.active} onConfirm={() => void confirmToggle()} onCancel={() => setPending(null)} />
    </>
  )
}

export function AdminMentorsPage() {
  const state = useAsync(() => adminService.pendingMentors(), [])
  const [reject, setReject] = useState<{ id: string; name: string } | null>(null)

  async function approve(id: string) {
    try { await adminService.reviewMentor(id, 'approve'); toast.success('Perfil aprovado.'); state.reload() } catch (e) { toast.error(errorMessage(e)) }
  }
  async function confirmReject() {
    if (!reject) return
    try { await adminService.reviewMentor(reject.id, 'reject'); toast.success('Perfil rejeitado.'); state.reload() } catch (e) { toast.error(errorMessage(e)) } finally { setReject(null) }
  }

  return (
    <>
      <PageHeader title="Perfis de mentores por aprovar" />
      <Load state={state} empty={(d) => d.length === 0}>
        {(items) => (
          <ul className="space-y-3">
            {items.map((m) => (
              <li key={m.id} className="card space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-semibold text-brand-700">{m.name}</p><p className="text-sm text-slate-600">{m.headline}</p></div>
                  <MentorVerification v={m.verification} />
                </div>
                <p className="text-sm text-slate-700">{m.bio}</p>
                <p className="text-sm text-slate-600"><strong>Qualificações:</strong> {m.qualifications.join('; ')}</p>
                <div className="flex gap-2">
                  <button type="button" className="btn-accent" onClick={() => void approve(m.id)}>Aprovar</button>
                  <button type="button" className="btn-danger" onClick={() => setReject({ id: m.id, name: m.name })}>Rejeitar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Load>
      <ConfirmDialog open={!!reject} title="Rejeitar perfil" message={`Rejeitar o perfil de ${reject?.name ?? ''}?`} confirmLabel="Rejeitar" onConfirm={() => void confirmReject()} onCancel={() => setReject(null)} />
    </>
  )
}

export function AdminScholarshipsPage() {
  const state = useAsync(() => adminService.scholarships(), [])
  const [editing, setEditing] = useState<Scholarship | 'new' | null>(null)
  const [toDeactivate, setToDeactivate] = useState<Scholarship | null>(null)

  async function verify(s: Scholarship) {
    try { await adminService.verifyScholarship(s.id); toast.success('Bolsa verificada.'); state.reload() } catch (e) { toast.error(errorMessage(e)) }
  }
  async function setActive(s: Scholarship, active: boolean) {
    try { await adminService.setScholarshipActive(s.id, active); toast.success(active ? 'Bolsa reactivada.' : 'Bolsa desactivada.'); state.reload() } catch (e) { toast.error(errorMessage(e)) } finally { setToDeactivate(null) }
  }

  if (editing) return <ScholarshipForm scholarship={editing === 'new' ? null : editing} onDone={() => { setEditing(null); state.reload() }} onCancel={() => setEditing(null)} />

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-700">Bolsas</h1>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>Nova bolsa</button>
      </div>
      <Load state={state} empty={(d) => d.length === 0}>
        {(items) => (
          <ul className="space-y-3">
            {items.map((s) => (
              <li key={s.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-brand-700">{s.title}</p>
                  <p className="text-sm text-slate-600">{s.institution} · {s.country} · Prazo: {formatDate(s.deadline)}</p>
                  <div className="flex flex-wrap gap-2"><VerificationBadge v={s.verification} /><StatusBadge s={s} />{s.active === false && <Badge tone="gray">Desactivada</Badge>}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-outline" onClick={() => setEditing(s)}>Editar</button>
                  {s.verification !== 'verified' && <button type="button" className="btn-accent" onClick={() => void verify(s)}>Verificar</button>}
                  {s.active === false
                    ? <button type="button" className="btn-outline" onClick={() => void setActive(s, true)}>Reactivar</button>
                    : <button type="button" className="btn-danger" onClick={() => setToDeactivate(s)}>Desactivar</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Load>
      <ConfirmDialog open={!!toDeactivate} title="Desactivar bolsa" message={`A bolsa «${toDeactivate?.title ?? ''}» deixará de aparecer publicamente.`} confirmLabel="Desactivar" onConfirm={() => toDeactivate && void setActive(toDeactivate, false)} onCancel={() => setToDeactivate(null)} />
    </>
  )
}

function ScholarshipForm({ scholarship, onDone, onCancel }: { scholarship: Scholarship | null; onDone: () => void; onCancel: () => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ScholarshipAdminInput>({
    resolver: zodResolver(scholarshipAdminSchema),
    defaultValues: { title: '', institution: '', country: '', level: 'bachelor', field: '', funding: 'full', modality: 'presential', deadline: '', sourceName: '', sourceUrl: '', applicationUrl: '', description: '' },
  })
  useEffect(() => {
    if (scholarship) reset({
      title: scholarship.title, institution: scholarship.institution, country: scholarship.country, level: scholarship.level,
      field: scholarship.field, funding: scholarship.funding, modality: scholarship.modality, deadline: scholarship.deadline?.slice(0, 10) ?? '',
      sourceName: scholarship.sourceName, sourceUrl: scholarship.sourceUrl ?? '', applicationUrl: scholarship.applicationUrl ?? '', description: scholarship.description,
    })
  }, [scholarship, reset])

  async function onSubmit(v: ScholarshipAdminInput) {
    try {
      if (scholarship) await adminService.updateScholarship(scholarship.id, v)
      else await adminService.createScholarship(v)
      toast.success('Bolsa guardada.')
      onDone()
    } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <>
      <PageHeader title={scholarship ? 'Editar bolsa' : 'Nova bolsa'} subtitle="Indique sempre a fonte oficial e só links reais de candidatura." />
      <form onSubmit={handleSubmit(onSubmit)} className="card max-w-2xl space-y-4" noValidate>
        <TextField label="Título" error={errors.title} {...register('title')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Instituição" error={errors.institution} {...register('institution')} />
          <TextField label="País" error={errors.country} {...register('country')} />
          <SelectField label="Nível" error={errors.level} {...register('level')}>
            <option value="bachelor">Licenciatura</option><option value="master">Mestrado</option><option value="phd">Doutoramento</option><option value="technical">Curso técnico</option><option value="other">Outro</option>
          </SelectField>
          <TextField label="Área de estudo" error={errors.field} {...register('field')} />
          <SelectField label="Financiamento" error={errors.funding} {...register('funding')}>
            <option value="full">Integral</option><option value="partial">Parcial</option><option value="other">Outro</option>
          </SelectField>
          <SelectField label="Modalidade" error={errors.modality} {...register('modality')}>
            <option value="presential">Presencial</option><option value="online">Online</option><option value="hybrid">Híbrida</option>
          </SelectField>
          <TextField label="Prazo" type="date" error={errors.deadline} {...register('deadline')} />
          <TextField label="Nome da fonte" error={errors.sourceName} {...register('sourceName')} />
        </div>
        <TextField label="URL da fonte" type="url" error={errors.sourceUrl} {...register('sourceUrl')} />
        <TextField label="URL oficial de candidatura" type="url" error={errors.applicationUrl} {...register('applicationUrl')} />
        <TextAreaField label="Descrição" error={errors.description} {...register('description')} />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'A guardar…' : 'Guardar'}</button>
          <button type="button" className="btn-outline" onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </>
  )
}

export function AdminReportedPage() {
  const state = useAsync(() => adminService.reportedServices(), [])
  const [target, setTarget] = useState<{ id: string; title: string } | null>(null)

  async function resolve(id: string, action: 'dismiss' | 'unpublish') {
    try { await adminService.resolveReport(id, action); toast.success('Denúncia tratada.'); state.reload() } catch (e) { toast.error(errorMessage(e)) } finally { setTarget(null) }
  }

  return (
    <>
      <PageHeader title="Cursos e mentorias denunciados" />
      <Load state={state} empty={(d) => d.length === 0}>
        {(items) => (
          <ul className="space-y-3">
            {items.map((s) => (
              <li key={s.id} className="card space-y-1">
                <p className="font-semibold text-brand-700">{s.title}</p>
                <p className="text-sm text-slate-600">{s.mentorName} · {formatPrice(s.price, s.currency)}</p>
                <div className="flex gap-2 pt-2">
                  <button type="button" className="btn-outline" onClick={() => void resolve(s.id, 'dismiss')}>Ignorar denúncia</button>
                  <button type="button" className="btn-danger" onClick={() => setTarget({ id: s.id, title: s.title })}>Retirar serviço</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Load>
      <ConfirmDialog open={!!target} title="Retirar serviço" message={`O serviço «${target?.title ?? ''}» deixará de ser público.`} confirmLabel="Retirar" onConfirm={() => target && void resolve(target.id, 'unpublish')} onCancel={() => setTarget(null)} />
    </>
  )
}

export function AdminReportsPage() {
  const state = useAsync(() => adminService.usageReport(), [])
  return (
    <>
      <PageHeader title="Relatórios de utilização" />
      <Load state={state}>
        {(r) => (
          <>
            <p className="mb-3 text-sm text-slate-500">Período: {r.period}</p>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[['Utilizadores', r.users], ['Mentores', r.mentors], ['Bolsas', r.scholarships], ['Favoritos', r.favorites]].map(([k, v]) => (
                <div key={String(k)} className="card"><dt className="text-sm text-slate-500">{k}</dt><dd className="text-2xl font-bold text-brand-700">{v}</dd></div>
              ))}
            </dl>
          </>
        )}
      </Load>
    </>
  )
}

export function AdminIntegrationsPage() {
  const state = useAsync(() => adminService.integrations(), [])
  const tone = { ok: 'green', error: 'red', disabled: 'gray' } as const
  const label = { ok: 'Operacional', error: 'Com erro', disabled: 'Desactivada' } as const
  return (
    <>
      <PageHeader title="Integrações de oportunidades" />
      <Load state={state} empty={(d) => d.length === 0}>
        {(items) => (
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.id} className="card flex flex-wrap items-center justify-between gap-2">
                <div><p className="font-semibold">{i.name}</p><p className="text-sm text-slate-500">Última execução: {i.lastRunAt ? formatDate(i.lastRunAt) : 'nunca'}</p>{i.message && <p className="text-sm text-slate-600">{i.message}</p>}</div>
                <Badge tone={tone[i.status]}>{label[i.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Load>
    </>
  )
}

export function AdminAuditPage() {
  const state = useAsync(() => adminService.audit(), [])
  return (
    <>
      <PageHeader title="Registos de auditoria" />
      <Load state={state} empty={(d) => d.length === 0}>
        {(items) => (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Data</th><th className="p-3">Autor</th><th className="p-3">Acção</th><th className="p-3">Alvo</th></tr></thead>
              <tbody>{items.map((a) => <tr key={a.id} className="border-t border-slate-200"><td className="p-3">{formatDate(a.at)}</td><td className="p-3">{a.actor}</td><td className="p-3">{a.action}</td><td className="p-3">{a.target}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </Load>
    </>
  )
}
