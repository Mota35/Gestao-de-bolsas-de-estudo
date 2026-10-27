import { zodResolver } from '@hookform/resolvers/zod'
import { LogOut } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { FormSelect, TextField } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'
import { ErrorState, Loading } from '../../components/ui/States'
import { academicLevels, areas, countries, nationalities } from '../../data/options'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'
import { useAuth } from '../../contexts/AuthContext'
import { env } from '../../lib/env'
import { getErrorMessage, getFieldErrors } from '../../lib/errors'
import { levelLabel } from '../../lib/format'
import { studentProfileSchema, type StudentProfileForm } from '../../schemas'
import { studentService } from '../../services'

const levelOptions = Object.values(levelLabel)

export default function StudentProfilePage() {
  useDocumentTitle('O meu perfil')
  const { logout } = useAuth()
  const { data, loading, error, reload } = useAsync(() => studentService.profile(), [])
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<StudentProfileForm>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: { displayName: '', nationality: '', academicLevel: '', area: '', targetLevel: '', targetCountry: '' },
  })

  useEffect(() => {
    if (data)
      reset({
        displayName: data.displayName,
        nationality: data.nationality,
        academicLevel: data.academicLevel,
        area: data.area,
        targetLevel: data.targetLevel,
        targetCountry: data.targetCountry,
      })
  }, [data, reset])

  if (loading) return <Loading />
  if (error || !data) return <ErrorState message={error ?? 'Não foi possível carregar o perfil.'} onRetry={reload} />

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await studentService.saveProfile(values)
      reset(values)
      toast.success('Perfil guardado.')
      return saved
    } catch (e) {
      Object.entries(getFieldErrors(e)).forEach(([k, v]) => setError(k as keyof StudentProfileForm, { message: v }))
      toast.error(getErrorMessage(e))
    }
  })
  const initials = data.displayName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <>
      <DashHead eyebrow="O meu perfil" title="Um perfil simples. Sugestões mais úteis." subtitle="Partilha apenas o necessário para orientar a pesquisa de oportunidades." action={<button type="button" onClick={() => void logout()} className="btn inline-flex items-center gap-2"><LogOut size={16} aria-hidden /> Terminar sessão</button>} />
      <div className="grid items-start gap-7 lg:grid-cols-[1fr_320px]">
        <form onSubmit={onSubmit} noValidate className="card p-7 max-sm:p-5">
          <div className="flex items-center gap-3 border-b border-line pb-[28px]">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-green">
              <span className="h-2 w-2 rounded-full bg-green" aria-hidden />
              {initials}
            </span>
            <div>
              <h2 className="display text-[24px] leading-8">{data.displayName}</h2>
              <p className="text-[12px] text-muted">{env.demoMode ? 'Pessoa fictícia · Dados de demonstração' : 'Perfil privado'}</p>
            </div>
          </div>
          <div className="mt-[24px] space-y-[24px]">
            <TextField label="Nome de apresentação" autoComplete="name" error={errors.displayName?.message} {...register('displayName')} />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormSelect control={control} name="nationality" label="Nacionalidade" options={nationalities} placeholder="Seleccionar" error={errors.nationality?.message} />
              <FormSelect
                control={control}
                name="academicLevel"
                label="Nível académico actual"
                options={academicLevels}
                placeholder="Seleccionar"
                error={errors.academicLevel?.message}
              />
              <FormSelect control={control} name="area" label="Área de estudo" options={areas} placeholder="Seleccionar" error={errors.area?.message} />
              <FormSelect control={control} name="targetLevel" label="Nível que procuras" options={levelOptions} placeholder="Seleccionar" error={errors.targetLevel?.message} />
            </div>
            <FormSelect
              control={control}
              name="targetCountry"
              label="País pretendido"
              options={countries}
              placeholder="Seleccionar"
              hint="Podes alterar o destino sempre que o teu plano mudar."
              error={errors.targetCountry?.message}
            />
            <TextField label="Email da conta" value={data.email} readOnly hint="Para alterar o contacto, consulta Conta e preferências." />
          </div>
          <div className="mt-[24px] flex flex-wrap gap-3">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? 'A guardar…' : 'Guardar alterações'}
            </button>
            <button type="button" className="btn" disabled={!isDirty} onClick={() => reset()}>
              Cancelar
            </button>
          </div>
          {env.demoMode && <p className="small mt-[22px] text-[13px]">Estado de edição ilustrativo. As alterações só existem durante esta sessão de demonstração.</p>}
        </form>

        <aside className="space-y-[24px]">
          <section className="notice notice-success rounded-2xl border border-line p-6">
            <h2 className="display text-[22px] leading-[30px]">Porque pedimos estes dados?</h2>
            <p className="mt-[20px] text-[14.5px] leading-[21px] text-ink">
              A nacionalidade, o nível, a área e o destino ajudam a mostrar oportunidades relevantes. Os critérios finais pertencem a cada instituição.
            </p>
          </section>
          <Notice tone="info" title="Sem documentos privados">
            Não precisas de passaporte, identificação, certificados, morada completa ou dados bancários para completar este perfil.
          </Notice>
          <section className="card p-6">
            <h2 className="display text-[18px] leading-7">O teu perfil não é público</h2>
            <p className="mt-[14px] text-[13.5px] leading-5 text-muted">Revê as preferências de privacidade e as notificações na área da conta.</p>
            <Link to="/estudante/conta" className="btn btn-block mt-[18px]">
              Conta e preferências
            </Link>
          </section>
        </aside>
      </div>
    </>
  )
}
