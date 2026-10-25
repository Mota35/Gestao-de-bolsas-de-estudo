import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { studentProfileSchema, type StudentProfileInput } from '../../schemas'
import { profileService } from '../../services/mentors'
import { favoriteService } from '../../services/favorites'
import { scholarshipService } from '../../services/scholarships'
import { errorMessage } from '../../services/api'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../contexts/AuthContext'
import { ScholarshipCard } from '../../components/ScholarshipCard'
import { EmptyState, ErrorState, PageHeader, SelectField, Spinner, TextField, Badge } from '../../components/ui'
import { formatDate } from '../../utils/format'

export function StudentHome() {
  const { user } = useAuth()
  const compat = useAsync(() => scholarshipService.compatible(), [])
  return (
    <>
      <PageHeader title={`Olá, ${user?.name.split(' ')[0] ?? ''}`} subtitle="Oportunidades compatíveis com o seu perfil." />
      {compat.loading ? <Spinner /> : compat.error ? <ErrorState message={compat.error} onRetry={compat.reload} /> :
        compat.data && compat.data.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">{compat.data.map((s) => <ScholarshipCard key={s.id} s={s} />)}</div>
        ) : (
          <EmptyState title="Ainda não há oportunidades compatíveis" text="Complete o seu perfil (nível, área de estudo e país pretendido) para receber sugestões." action={<Link to="/estudante/perfil" className="btn-primary">Completar perfil</Link>} />
        )}
    </>
  )
}

export function StudentProfilePage() {
  const { data, loading, error, reload } = useAsync(() => profileService.get(), [])
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<StudentProfileInput>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: { nationality: '', educationLevel: '', fieldOfStudy: '', targetCountry: '', phone: '', notifyDeadlines: false },
  })
  useEffect(() => { if (data) reset({ ...data, phone: data.phone ?? '' }) }, [data, reset])

  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} onRetry={reload} />

  async function onSubmit(values: StudentProfileInput) {
    try {
      await profileService.save(values)
      toast.success('Perfil guardado.')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <>
      <PageHeader title="O meu perfil" subtitle="Recolhemos apenas os dados necessários para sugerir oportunidades." />
      <form onSubmit={handleSubmit(onSubmit)} className="card max-w-xl space-y-4" noValidate>
        <TextField label="País de nacionalidade" error={errors.nationality} {...register('nationality')} />
        <SelectField label="Nível académico" error={errors.educationLevel} {...register('educationLevel')}>
          <option value="">Seleccione</option>
          <option value="bachelor">Licenciatura</option>
          <option value="master">Mestrado</option>
          <option value="phd">Doutoramento</option>
          <option value="technical">Curso técnico</option>
          <option value="other">Outro</option>
        </SelectField>
        <TextField label="Área de estudo" error={errors.fieldOfStudy} {...register('fieldOfStudy')} />
        <TextField label="País pretendido" error={errors.targetCountry} {...register('targetCountry')} />
        <TextField label="Telefone de contacto (opcional)" type="tel" autoComplete="tel" error={errors.phone} {...register('phone')} />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" {...register('notifyDeadlines')} /> Quero receber lembretes de prazos
        </label>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'A guardar…' : 'Guardar perfil'}</button>
      </form>
    </>
  )
}

export function StudentFavoritesPage() {
  const { data, loading, error, reload } = useAsync(() => favoriteService.list(), [])
  return (
    <>
      <PageHeader title="Bolsas guardadas" />
      {loading ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> :
        data && data.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">{data.map((s) => <ScholarshipCard key={s.id} s={s} />)}</div>
        ) : <EmptyState title="Ainda não guardou nenhuma bolsa" action={<Link to="/bolsas" className="btn-primary">Explorar bolsas</Link>} />}
    </>
  )
}

export function StudentApplicationsPage() {
  const { data, loading, error, reload } = useAsync(() => favoriteService.applications(), [])
  const labels = { draft: 'Rascunho', submitted: 'Submetida', accepted: 'Aceite', rejected: 'Rejeitada' } as const
  return (
    <>
      <PageHeader title="Candidaturas" subtitle="Candidaturas registadas na plataforma." />
      {loading ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> :
        data && data.length > 0 ? (
          <ul className="space-y-3">
            {data.map((a) => (
              <li key={a.id} className="card flex items-center justify-between">
                <div>
                  <Link to={`/bolsas/${a.scholarshipId}`} className="font-semibold text-brand-700 hover:underline">{a.scholarshipTitle}</Link>
                  <p className="text-sm text-slate-500">Actualizada em {formatDate(a.updatedAt)}</p>
                </div>
                <Badge tone={a.status === 'accepted' ? 'green' : a.status === 'rejected' ? 'red' : 'blue'}>{labels[a.status]}</Badge>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="Sem candidaturas registadas" text="As candidaturas são feitas nos sites oficiais das instituições." />}
    </>
  )
}
