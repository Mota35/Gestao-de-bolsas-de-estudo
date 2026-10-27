import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { CheckField, FormSelect, TextAreaField, TextField } from '../../components/ui/Field'
import { Dot, Notice } from '../../components/ui/Notice'
import { ErrorState, Loading } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'
import { env } from '../../lib/env'
import { getErrorMessage, getFieldErrors } from '../../lib/errors'
import { mentorProfileSchema, type MentorProfileForm } from '../../schemas'
import { mentorAreaService } from '../../services'

const languageOptions = ['Português', 'Inglês', 'Francês', 'Português · Inglês', 'Português · Francês', 'Português · Inglês · Francês']
const modalityOptions = ['Online', 'Presencial', 'Online · Presencial']

export default function MentorProfilePage() {
  useDocumentTitle('Perfil profissional')
  const { data, loading, error, reload } = useAsync(() => mentorAreaService.profile(), [])
  const fileRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<string | undefined>()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MentorProfileForm>({
    resolver: zodResolver(mentorProfileSchema),
    defaultValues: {
      name: '',
      title: '',
      bio: '',
      specialties: '',
      experience: '',
      languages: 'Português',
      modalities: 'Online',
      place: '',
      whatsapp: '',
      whatsappConsent: false,
      confirmTruth: false,
    },
  })

  useEffect(() => {
    if (!data) return
    const { name, title, bio, specialties, experience, languages, modalities, place, whatsapp, whatsappConsent, confirmTruth } = data
    reset({ name, title, bio, specialties, experience, languages, modalities, place, whatsapp, whatsappConsent, confirmTruth })
    setPhoto(data.photo)
  }, [data, reset])

  useEffect(
    () => () => {
      if (photo?.startsWith('blob:')) URL.revokeObjectURL(photo)
    },
    [photo],
  )

  const v = watch()
  if (loading) return <Loading />
  if (error || !data) return <ErrorState message={error ?? 'Não foi possível carregar o perfil.'} onRetry={reload} />

  const save = async (values: MentorProfileForm) => {
    try {
      await mentorAreaService.saveProfile(values)
      toast.success('Alterações guardadas.')
      return true
    } catch (e) {
      Object.entries(getFieldErrors(e)).forEach(([k, m]) => setError(k as keyof MentorProfileForm, { message: m }))
      toast.error(getErrorMessage(e))
      return false
    }
  }
  const onSave = handleSubmit(async (values) => void (await save(values)))
  const onReview = handleSubmit(async (values) => {
    if (!values.confirmTruth) {
      setError('confirmTruth', { message: 'Confirma que as informações são verdadeiras para pedir revisão.' })
      return
    }
    if (!(await save(values))) return
    try {
      await mentorAreaService.requestReview()
      toast.success('Pedido de revisão registado. A revisão não está garantida.')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  })

  const onPhoto = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) {
      toast.error('Escolhe uma imagem até 3 MB. Não carregues documentos.')
      return
    }
    try {
      await mentorAreaService.uploadPhoto(file)
      setPhoto(URL.createObjectURL(file))
      toast.success('Fotografia actualizada.')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  const pending = data.verification !== 'verificado'

  return (
    <>
      <DashHead title="O teu perfil profissional" subtitle="Apresenta o teu percurso e escolhe o que fica visível para os estudantes." />
      {pending && (
        <Notice tone="warn" title="Verificação pendente" className="mb-[28px] !py-[20px]">
          O perfil está por analisar. A revisão é independente de pagamentos e não está garantida pela publicação de um serviço.
        </Notice>
      )}
      <form onSubmit={onSave} noValidate className="grid items-start gap-7 lg:grid-cols-[1fr_330px]">
        <div className="space-y-[24px]">
          <section className="card p-6 pb-[24px]">
            <h2 className="display text-[24px] leading-8">Apresentação pública</h2>
            <div className="mt-[22px] flex items-center gap-5">
              {photo ? (
                <img src={photo} alt="Fotografia de perfil" className="h-[100px] w-[100px] rounded-xl object-cover" />
              ) : (
                <span className="flex h-[100px] w-[100px] items-center justify-center rounded-xl bg-mint text-[28px] font-bold text-green" aria-hidden>
                  {v.name
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')}
                </span>
              )}
              <div>
                <p className="text-[14px] font-semibold">Fotografia (opcional)</p>
                <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Escolher fotografia" onChange={(e) => onPhoto(e.target.files?.[0])} />
                <button type="button" className="btn btn-sm mt-[10px]" onClick={() => fileRef.current?.click()}>
                  Alterar fotografia
                </button>
                <p className="small mt-[8px] text-[12px]">Retrato {env.demoMode ? 'ilustrativo' : 'profissional'}. Não carregues documentos.</p>
              </div>
            </div>
            <div className="mt-[22px] space-y-[22px]">
              <TextField label="Nome profissional" error={errors.name?.message} {...register('name')} />
              <TextField label="Título profissional" error={errors.title?.message} {...register('title')} />
              <TextAreaField label="Biografia" rows={4} error={errors.bio?.message} {...register('bio')} />
              <TextField label="Especialidades e áreas" hint="Escolhe apenas áreas em que tens experiência." error={errors.specialties?.message} {...register('specialties')} />
              <TextAreaField label="Experiência e qualificações" rows={4} error={errors.experience?.message} {...register('experience')} />
              <div className="grid gap-5 sm:grid-cols-2">
                <FormSelect control={control} name="languages" label="Idiomas" options={languageOptions} error={errors.languages?.message} />
                <FormSelect control={control} name="modalities" label="Modalidades" options={modalityOptions} error={errors.modalities?.message} />
              </div>
              <TextField label="Local de atendimento presencial" hint="Não publiques a tua morada pessoal." error={errors.place?.message} {...register('place')} />
            </div>
          </section>

          <section className="card p-6 pb-[24px]">
            <h2 className="display text-[24px] leading-8">WhatsApp e consentimento</h2>
            <div className="mt-[22px] space-y-[22px]">
              <TextField
                label="WhatsApp profissional (opcional)"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Número não preenchido"
                hint="Formato internacional, apenas dígitos. Exemplo de estrutura: 244 + número, sem contacto real."
                error={errors.whatsapp?.message}
                {...register('whatsapp')}
              />
              <CheckField
                label="Autorizo, separadamente, a divulgação do meu contacto WhatsApp no perfil público e nos serviços que seleccionar."
                {...register('whatsappConsent')}
              />
              {!v.whatsappConsent && (
                <Notice tone="info" title="Contacto não divulgado">
                  Sem autorização explícita, não mostramos o número nem o botão de WhatsApp. Podes retirar o consentimento.
                </Notice>
              )}
              <CheckField
                label="Confirmo que as informações profissionais são verdadeiras e aceito a revisão do perfil."
                error={errors.confirmTruth?.message}
                {...register('confirmTruth')}
              />
            </div>
            <div className="mt-[22px] flex flex-wrap gap-3">
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'A guardar…' : 'Guardar alterações'}
              </button>
              <button type="button" className="btn" onClick={onReview} disabled={isSubmitting}>
                Pedir revisão
              </button>
            </div>
            {env.demoMode && <p className="small mt-[20px] text-[13px]">Acções de demonstração. Nenhum contacto é recolhido ou publicado.</p>}
          </section>
        </div>

        <aside className="space-y-[24px]">
          <section className="card p-6 pb-[22px]">
            <p className="eyebrow !font-bold !text-[11px]">Pré-visualização</p>
            {photo && <img src={photo} alt="" className="mt-[18px] h-[230px] w-full rounded-xl object-cover" />}
            <h2 className="display mt-[18px] text-[26px] leading-8">{v.name}</h2>
            <Dot tone={pending ? 'amber' : 'green'} className="mt-[18px]">
              {pending ? 'Perfil não verificado' : 'Perfil verificado'}
            </Dot>
            <p className="mt-[16px] text-[15px] leading-[21px]">{v.title}</p>
            <p className="mt-[16px] text-[14px] leading-5 text-muted">
              {data.location} · {v.languages.replace(' · ', ' e ')}
              <br />
              {v.modalities.replace(' · ', ' e ').replace('Online e Presencial', 'Online e presencial')}
            </p>
            <hr className="my-[16px] border-0 border-t border-line" />
            <p className="small text-[13px]">
              {v.whatsappConsent && v.whatsapp ? 'Botão WhatsApp visível após a revisão do perfil.' : 'Botão WhatsApp oculto: autorização não concedida.'}
            </p>
          </section>
          <Notice tone="info" title="O que a revisão avalia">
            Coerência do perfil, experiência declarada e conformidade com as regras. Não compres nem prometas verificação.
          </Notice>
        </aside>
      </form>
    </>
  )
}
