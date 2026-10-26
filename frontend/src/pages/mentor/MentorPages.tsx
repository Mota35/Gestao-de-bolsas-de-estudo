import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { mentorProfileSchema, serviceSchema, type MentorProfileFormInput, type ServiceFormInput } from '../../schemas'
import { mentorService } from '../../services/mentors'
import { ApiError, errorMessage } from '../../services/api'
import { useAsync } from '../../hooks/useAsync'
import { MentorVerification } from '../../components/MentorCards'
import { Badge, ConfirmDialog, EmptyState, ErrorState, PageHeader, SelectField, Spinner, TextAreaField, TextField } from '../../components/ui'
import { formatPrice, splitList } from '../../utils/format'
import type { MentorService } from '../../types'

export function MentorProfilePage() {
  const { data, loading, error, reload } = useAsync(async () => {
    try {
      return await mentorService.myProfile()
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null // perfil ainda não criado
      throw e
    }
  }, [])

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MentorProfileFormInput>({
    resolver: zodResolver(mentorProfileSchema),
    defaultValues: { headline: '', bio: '', specialties: '', experience: '', qualifications: '', languages: '', whatsapp: '', whatsappPublic: false, photoUrl: '' },
  })

  useEffect(() => {
    if (data) {
      reset({
        headline: data.headline, bio: data.bio, specialties: data.specialties.join(', '),
        experience: data.experience, qualifications: data.qualifications.join(', '),
        languages: data.languages.join(', '), whatsapp: data.whatsapp ?? '',
        whatsappPublic: data.whatsappPublic, photoUrl: data.photoUrl ?? '',
      })
    }
  }, [data, reset])

  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} onRetry={reload} />

  async function onSubmit(v: MentorProfileFormInput) {
    try {
      await mentorService.saveMyProfile({
        headline: v.headline, bio: v.bio, experience: v.experience, whatsapp: v.whatsapp,
        whatsappPublic: v.whatsappPublic, photoUrl: v.photoUrl || undefined,
        specialties: splitList(v.specialties), qualifications: splitList(v.qualifications), languages: splitList(v.languages),
      })
      toast.success('Perfil guardado. Alterações podem exigir nova verificação.')
      reload()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader title="Perfil profissional" />
      {data && <div className="mb-4 flex items-center gap-2 text-sm"><span>Estado:</span><MentorVerification v={data.verification} /></div>}
      {data && data.verification !== 'verified' && (
        <p role="note" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          O seu perfil ainda não está verificado e será mostrado publicamente como «não verificado» até aprovação da equipa.
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="card max-w-2xl space-y-4" noValidate>
        <TextField label="Título profissional" error={errors.headline} {...register('headline')} />
        <TextAreaField label="Biografia" error={errors.bio} {...register('bio')} />
        <TextField label="Especialidades e áreas de ensino" hint="Separe por vírgulas." error={errors.specialties} {...register('specialties')} />
        <TextAreaField label="Experiência" error={errors.experience} {...register('experience')} />
        <TextField label="Qualificações" hint="Separe por vírgulas." error={errors.qualifications} {...register('qualifications')} />
        <TextField label="Idiomas" hint="Separe por vírgulas." error={errors.languages} {...register('languages')} />
        <TextField label="Fotografia (URL, opcional)" type="url" error={errors.photoUrl} {...register('photoUrl')} />
        <TextField label="Número de WhatsApp" type="tel" hint="Formato internacional, por exemplo +244 923 000 000." error={errors.whatsapp} {...register('whatsapp')} />
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" {...register('whatsappPublic')} />
          <span>Autorizo a divulgação pública do meu número de WhatsApp nos meus serviços e perfil.</span>
        </label>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'A guardar…' : 'Guardar perfil'}</button>
      </form>
    </>
  )
}

const emptyService: ServiceFormInput = { title: '', description: '', kind: 'mentoring', price: 0, currency: 'AOA', mode: 'online', availability: '', published: false }

export function MentorServicesPage() {
  const { data, loading, error, reload } = useAsync(() => mentorService.myServices(), [])
  const [editing, setEditing] = useState<MentorService | 'new' | null>(null)
  const [toDelete, setToDelete] = useState<MentorService | null>(null)

  async function togglePublish(s: MentorService) {
    try {
      await mentorService.setServicePublished(s.id, !s.published)
      toast.success(s.published ? 'Serviço desactivado.' : 'Serviço publicado.')
      reload()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    try {
      await mentorService.deleteService(toDelete.id)
      toast.success('Serviço eliminado.')
      reload()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setToDelete(null)
    }
  }

  if (editing) {
    return <ServiceForm service={editing === 'new' ? null : editing} onDone={() => { setEditing(null); reload() }} onCancel={() => setEditing(null)} />
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-700">Os meus serviços</h1>
        <button type="button" className="btn-primary" onClick={() => setEditing('new')}>Novo serviço</button>
      </div>
      {loading ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> :
        data && data.length > 0 ? (
          <ul className="space-y-3">
            {data.map((s) => (
              <li key={s.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-700">{s.title}</p>
                  <p className="text-sm text-slate-600">{formatPrice(s.price, s.currency)} · {s.mode === 'online' ? 'Online' : 'Presencial'}</p>
                  <Badge tone={s.published ? 'green' : 'gray'}>{s.published ? 'Publicado' : 'Desactivado'}</Badge>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-outline" onClick={() => setEditing(s)}>Editar</button>
                  <button type="button" className="btn-outline" onClick={() => void togglePublish(s)}>{s.published ? 'Desactivar' : 'Publicar'}</button>
                  <button type="button" className="btn-danger" onClick={() => setToDelete(s)}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="Ainda não criou serviços" text="Crie o seu primeiro curso ou mentoria." />}
      <ConfirmDialog open={!!toDelete} title="Eliminar serviço" message={`Tem a certeza de que quer eliminar «${toDelete?.title ?? ''}»? Esta acção não pode ser desfeita.`} confirmLabel="Eliminar" onConfirm={() => void confirmDelete()} onCancel={() => setToDelete(null)} />
    </>
  )
}

function ServiceForm({ service, onDone, onCancel }: { service: MentorService | null; onDone: () => void; onCancel: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ServiceFormInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: service ? { title: service.title, description: service.description, kind: service.kind, price: service.price, currency: service.currency, mode: service.mode, availability: service.availability, published: service.published } : emptyService,
  })

  async function onSubmit(v: ServiceFormInput) {
    try {
      if (service) await mentorService.updateService(service.id, v)
      else await mentorService.createService(v)
      toast.success('Serviço guardado.')
      onDone()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader title={service ? 'Editar serviço' : 'Novo serviço'} />
      <form onSubmit={handleSubmit(onSubmit)} className="card max-w-2xl space-y-4" noValidate>
        <TextField label="Título" error={errors.title} {...register('title')} />
        <TextAreaField label="Descrição" error={errors.description} {...register('description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Tipo" error={errors.kind} {...register('kind')}>
            <option value="mentoring">Mentoria</option>
            <option value="course">Curso</option>
          </SelectField>
          <SelectField label="Modalidade" error={errors.mode} {...register('mode')}>
            <option value="online">Online</option>
            <option value="presential">Presencial</option>
          </SelectField>
          <TextField label="Preço" type="number" step="0.01" min="0" error={errors.price} {...register('price')} />
          <SelectField label="Moeda" error={errors.currency} {...register('currency')}>
            <option value="AOA">Kwanza (AOA)</option>
            <option value="USD">Dólar (USD)</option>
            <option value="EUR">Euro (EUR)</option>
          </SelectField>
        </div>
        <TextField label="Disponibilidade" hint="Exemplo: Sábados, 9h–12h" error={errors.availability} {...register('availability')} />
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" {...register('published')} /> Publicar este serviço</label>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'A guardar…' : 'Guardar'}</button>
          <button type="button" className="btn-outline" onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </>
  )
}
