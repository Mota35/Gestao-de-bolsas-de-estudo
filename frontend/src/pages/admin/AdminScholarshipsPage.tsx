import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable } from '../../components/ui/DataTable'
import { CheckField, SelectField, TextAreaField, TextField } from '../../components/ui/Field'
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
import { languageText, useLanguage } from '../../contexts/LanguageContext'

export default function AdminScholarshipsPage() {
  const { language } = useLanguage()
  const tr = (pt: string, en: string) => languageText(language, pt, en)
  useDocumentTitle('Gestão de bolsas')
  const { data, loading, error, reload } = useAsync(() => adminService.scholarships(), [])
  const [draft, setDraft] = useState({ verification: '', state: '' })
  const [applied, setApplied] = useState(draft)
  const [selected, setSelected] = useState('')
  const [deadline, setDeadline] = useState('')
  const [sourceChecked, setSourceChecked] = useState(false)
  const [deactivate, setDeactivate] = useState<AdminScholarshipRow | null>(null)
  const [busy, setBusy] = useState(false)
  const sources = useAsync(() => adminService.scholarshipSources(), [])
  const [creating, setCreating] = useState(false)
  const [newSource, setNewSource] = useState({ name: '', officialUrl: '' })
  const [form, setForm] = useState({ title: '', description: '', sponsoringInstitution: '', destinationCountry: 'Angola', educationLevel: 'BACHELOR', studyAreas: '', fundingType: 'FULL', officialUrl: '', sourceId: '', openingDate: '', applicationDeadline: '' })

  if (loading) return <Loading />
  if (error || !data) return <ErrorState message={error ?? 'Não foi possível carregar as bolsas.'} onRetry={reload} />
  const rows = data.filter((s) => (!applied.verification || s.verification === applied.verification) && (!applied.state || (applied.state === 'activa') === s.active))
  const current = data.find((s) => s.id === selected) ?? data.find((s) => s.title === 'Programa Pontes') ?? data[0]
  const refLabel = formatDate(referenceDate().toISOString().slice(0, 10))

  const run = async (fn: () => Promise<unknown>, ok: string): Promise<boolean> => {
    setBusy(true)
    try {
      await fn()
      toast.success(ok)
      reload()
      return true
    } catch (err) {
      toast.error(getErrorMessage(err))
      return false
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
  const registerSource = async () => {
    const source = await adminService.createScholarshipSource({ ...newSource, sourceType: 'OFFICIAL_INSTITUTION', collectionMethod: 'MANUAL' })
    sources.setData([...(sources.data ?? []), source])
    setForm((currentForm) => ({ ...currentForm, sourceId: source.id }))
    setNewSource({ name: '', officialUrl: '' })
  }

  return (
    <>
      <DashHead eyebrow={tr('Acesso restrito · Editorial', 'Restricted access · Editorial')} title={tr('Gestão de bolsas', 'Scholarship management')} subtitle={tr('Registar bolsas manualmente, rever fontes, prazos e estados.', 'Add scholarships manually and review sources, deadlines and status.')} action={<button type="button" className="btn btn-primary" onClick={() => setCreating((v) => !v)}>{creating ? tr('Fechar formulário', 'Close form') : tr('Registar bolsa', 'Add scholarship')}</button>} />
      {creating && (
        <section className="card mb-7 p-6">
          <h2 className="display text-[24px] leading-8">{tr('Nova bolsa · rascunho', 'New scholarship · draft')}</h2>
          <p className="mt-2 text-sm text-muted">{tr('A bolsa começa como rascunho e não será publicada até ser verificada.', 'The scholarship starts as a draft and will not be published until verified.')}</p>
          {sources.data?.length ? (
            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const source = sources.data?.find((s) => s.id === form.sourceId) ?? sources.data?.[0]; if (!source) return; void run(() => adminService.createScholarship({ title: form.title, description: form.description, sponsoringInstitution: form.sponsoringInstitution, destinationCountry: form.destinationCountry, educationLevel: [form.educationLevel], studyAreas: form.studyAreas.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean), fundingType: form.fundingType, officialUrl: form.officialUrl, sourceId: form.sourceId || source.id, openingDate: form.openingDate || null, applicationDeadline: form.applicationDeadline || null }), 'Bolsa registada como rascunho.').then((ok) => { if (ok) setCreating(false) }) }}>
              <TextField label={tr('Título', 'Title')} required minLength={5} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <TextField label={tr('Instituição responsável', 'Sponsoring institution')} required value={form.sponsoringInstitution} onChange={(e) => setForm({ ...form, sponsoringInstitution: e.target.value })} />
              <TextField label={tr('País de destino', 'Destination country')} required value={form.destinationCountry} onChange={(e) => setForm({ ...form, destinationCountry: e.target.value })} />
              <SelectField label={tr('Nível de ensino', 'Education level')} value={form.educationLevel} onChange={(v) => setForm({ ...form, educationLevel: v })} options={[{ value: 'BACHELOR', label: tr('Licenciatura', "Bachelor's degree") }, { value: 'MASTER', label: tr('Mestrado', "Master's degree") }, { value: 'DOCTORATE', label: tr('Doutoramento', 'Doctorate') }, { value: 'VOCATIONAL', label: tr('Formação técnica', 'Vocational training') }, { value: 'SHORT_COURSE', label: tr('Curso de curta duração', 'Short course') }, { value: 'OTHER', label: tr('Outro', 'Other') }]} />
              <TextField label={tr('Áreas de estudo (separadas por vírgula)', 'Study areas (comma-separated)')} required value={form.studyAreas} onChange={(e) => setForm({ ...form, studyAreas: e.target.value })} />
              <SelectField label={tr('Financiamento', 'Funding')} value={form.fundingType} onChange={(v) => setForm({ ...form, fundingType: v })} options={[{ value: 'FULL', label: tr('Integral', 'Full') }, { value: 'PARTIAL', label: tr('Parcial', 'Partial') }, { value: 'TUITION_ONLY', label: tr('Propinas', 'Tuition only') }, { value: 'STIPEND', label: tr('Subsídio', 'Stipend') }, { value: 'OTHER', label: tr('Outro', 'Other') }]} />
              <TextField label={tr('Link oficial', 'Official link')} type="url" required value={form.officialUrl} onChange={(e) => setForm({ ...form, officialUrl: e.target.value })} />
              <SelectField label={tr('Fonte registada', 'Registered source')} value={form.sourceId} onChange={(v) => setForm({ ...form, sourceId: v })} options={sources.data.map((s) => ({ value: s.id, label: s.name }))} placeholder={tr('Escolhe uma fonte', 'Choose a source')} />
              <TextField label={tr('Data de abertura', 'Opening date')} type="date" value={form.openingDate} onChange={(e) => setForm({ ...form, openingDate: e.target.value })} />
              <TextField label={tr('Prazo de candidatura', 'Application deadline')} type="date" required value={form.applicationDeadline} onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })} />
              <div className="md:col-span-2"><TextAreaField label={tr('Descrição', 'Description')} required minLength={20} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex flex-wrap items-end gap-3 md:col-span-2"><button className="btn btn-primary" type="submit" disabled={busy || sources.loading}>Guardar rascunho</button><span className="text-sm text-muted">Fonte em falta?</span><TextField label="Nome da fonte" value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })} /><TextField label="Site oficial da fonte" type="url" value={newSource.officialUrl} onChange={(e) => setNewSource({ ...newSource, officialUrl: e.target.value })} /><button type="button" className="btn" disabled={busy || !newSource.name || !newSource.officialUrl} onClick={() => void run(registerSource, 'Fonte registada.')}>Registar fonte</button></div>
            </form>
          ) : (
            <div className="mt-5"><p className="mb-4 text-sm text-muted">Regista primeiro a fonte oficial usada para confirmar a bolsa.</p><div className="flex flex-wrap items-end gap-3"><TextField label="Nome da fonte" value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })} /><TextField label="Site oficial da fonte" type="url" value={newSource.officialUrl} onChange={(e) => setNewSource({ ...newSource, officialUrl: e.target.value })} /><button type="button" className="btn btn-primary" disabled={busy || !newSource.name || !newSource.officialUrl} onClick={() => void run(registerSource, 'Fonte registada.')}>Registar fonte oficial</button></div></div>
          )}
        </section>
      )}
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
        {tr('As bolsas novas ficam em rascunho e só aparecem aos estudantes depois de enviadas para revisão, verificadas e publicadas. O prazo também precisa de estar aberto.', 'New scholarships stay as drafts and only appear to students after review, verification and publication. The application deadline must also be open.')}
      </Notice>
      <div className="mt-[28px]">
        <DataTable
          rows={rows}
          rowKey={(s) => s.id}
          empty="Nenhuma bolsa corresponde aos filtros."
          columns={[
            { header: 'Bolsa', render: (s) => s.title },
            { header: tr('Publicação', 'Publication'), render: (s) => ({ DRAFT: tr('Rascunho', 'Draft'), IN_REVIEW: tr('Em revisão', 'In review'), PUBLISHED: tr('Publicada', 'Published'), ARCHIVED: tr('Arquivada', 'Archived') })[s.publicationStatus] },
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
                  {s.publicationStatus === 'DRAFT' && (
                    <button type="button" className="hover:underline" disabled={busy} onClick={() => void run(() => adminService.transitionScholarship(s.id, 'IN_REVIEW'), tr('Bolsa enviada para revisão.', 'Scholarship sent for review.'))}>
                      {tr('Enviar para revisão', 'Send for review')}
                    </button>
                  )}
                  {s.publicationStatus === 'IN_REVIEW' && s.verification === 'pendente' && (
                    <>
                      {' · '}
                      <button type="button" className="hover:underline" disabled={busy} onClick={() => void run(() => adminService.verifyScholarship(s.id), tr('Fonte verificada.', 'Source verified.'))}>
                        {tr('Verificar fonte', 'Verify source')}
                      </button>
                    </>
                  )}
                  {s.publicationStatus === 'IN_REVIEW' && s.verification === 'verificada' && (
                    <>
                      {' · '}
                      <button type="button" className="hover:underline" disabled={busy} onClick={() => void run(() => adminService.transitionScholarship(s.id, 'PUBLISHED'), tr('Bolsa publicada.', 'Scholarship published.'))}>
                        {tr('Publicar', 'Publish')}
                      </button>
                    </>
                  )}
                  {s.publicationStatus === 'PUBLISHED' && (
                    <button type="button" className="hover:underline" onClick={() => setDeactivate(s)}>{tr('Desactivar', 'Unpublish')}</button>
                  )}
                  {s.publicationStatus === 'ARCHIVED' && (
                    <button type="button" className="hover:underline" disabled={busy} onClick={() => void run(() => adminService.transitionScholarship(s.id, 'DRAFT'), tr('Bolsa reaberta como rascunho.', 'Scholarship reopened as a draft.'))}>{tr('Reabrir rascunho', 'Reopen draft')}</button>
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
        title={`${tr('Desactivar', 'Unpublish')} ${deactivate?.title ?? tr('bolsa', 'scholarship')}?`}
        confirmLabel={tr('Desactivar', 'Unpublish')}
        onCancel={() => setDeactivate(null)}
        onConfirm={() => {
          const s = deactivate
          setDeactivate(null)
          if (s) void run(() => adminService.deactivateScholarship(s.id), tr('Bolsa desactivada.', 'Scholarship unpublished.'))
        }}
      >
        {tr('A bolsa deixa de aparecer no catálogo público. A acção fica registada na auditoria.', 'The scholarship will no longer appear in the public catalogue. This action is recorded in the audit log.')}
      </ConfirmDialog>
    </>
  )
}
