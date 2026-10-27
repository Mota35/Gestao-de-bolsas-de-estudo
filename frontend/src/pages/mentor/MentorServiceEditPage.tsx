import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CheckField, FormSelect, TextAreaField, TextField } from '../../components/ui/Field'
import { Dot, Notice } from '../../components/ui/Notice'
import { ErrorState, Loading } from '../../components/ui/States'
import { mentorSpecialties } from '../../data/options'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'
import { env } from '../../lib/env'
import { getErrorMessage, getFieldErrors } from '../../lib/errors'
import { formatKz } from '../../lib/format'
import { serviceSchema, type ServiceForm } from '../../schemas'
import { mentorAreaService } from '../../services'
import type { PublishState } from '../../types'

const empty: ServiceForm = {
  title: '',
  description: '',
  specialty: mentorSpecialties[0],
  kind: 'mentoria',
  price: 0,
  currency: 'AOA',
  duration: '',
  modality: 'online',
  place: '',
  availability: '',
  conditions: '',
  state: 'rascunho',
  showWhatsApp: false,
}
const stateLabel: Record<PublishState, string> = { rascunho: 'Rascunho', publicado: 'Publicado', desactivado: 'Desactivado' }

export default function MentorServiceEditPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  useDocumentTitle(isNew ? 'Criar serviço' : 'Editar serviço')
  const service = useAsync(() => (id ? mentorAreaService.service(id) : Promise.resolve(null)), [id])
  const profile = useAsync(() => mentorAreaService.profile(), [])
  const [confirm, setConfirm] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ServiceForm>({ resolver: zodResolver(serviceSchema), defaultValues: empty })

  useEffect(() => {
    if (service.data) {
      const { id: _id, ...rest } = service.data
      reset(rest as ServiceForm)
    } else if (isNew) reset(empty)
  }, [service.data, isNew, reset])

  const v = watch()
  if (service.loading || profile.loading) return <Loading />
  if (service.error) return <ErrorState message={service.error} onRetry={service.reload} />

  const consent = !!profile.data?.whatsappConsent && !!profile.data.whatsapp
  const submitWith = (state: PublishState) => {
    setValue('state', state)
    void handleSubmit(async (values) => {
      try {
        if (id) await mentorAreaService.saveService(id, values)
        else await mentorAreaService.createService(values)
        toast.success(state === 'publicado' ? 'Serviço publicado.' : state === 'desactivado' ? 'Serviço desactivado.' : 'Rascunho guardado.')
        navigate('/mentor')
      } catch (e) {
        Object.entries(getFieldErrors(e)).forEach(([k, m]) => setError(k as keyof ServiceForm, { message: m }))
        toast.error(getErrorMessage(e))
      }
    })()
  }
  const presencial = v.modality === 'presencial'
  const mentorName = profile.data?.name ?? ''

  return (
    <>
      <DashHead
        eyebrow={isNew ? 'Serviços / Novo' : 'Serviços / Editar'}
        title="Dá forma à tua orientação"
        subtitle="Define conteúdo, preço, modalidade e disponibilidade antes de publicar."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submitWith(v.state)
        }}
        noValidate
        className="grid items-start gap-7 lg:grid-cols-[1fr_330px]"
      >
        <div className="space-y-[24px]">
          <section className="card p-6 pb-[28px]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="display text-[24px] leading-8">Detalhes do serviço</h2>
              <Dot tone="gray">{stateLabel[v.state]}</Dot>
            </div>
            <div className="mt-[22px] space-y-[22px]">
              <TextField label="Título" error={errors.title?.message} {...register('title')} />
              <TextAreaField label="Descrição" rows={3} error={errors.description?.message} {...register('description')} />
              <div className="grid gap-5 sm:grid-cols-2">
                <FormSelect control={control} name="specialty" label="Especialidade" options={mentorSpecialties} error={errors.specialty?.message} />
                <FormSelect
                  control={control}
                  name="kind"
                  label="Tipo"
                  options={[
                    { value: 'mentoria', label: 'Mentoria individual' },
                    { value: 'curso', label: 'Curso em grupo' },
                  ]}
                  hint="Alternativa: curso"
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Preço" inputMode="numeric" error={errors.price?.message} {...register('price', { setValueAs: (x) => Number(String(x).replace(/\D/g, '')) })} />
                <FormSelect control={control} name="currency" label="Moeda" options={[{ value: 'AOA', label: 'AOA · Kwanza (Kz)' }]} />
              </div>
              <TextField label="Duração" error={errors.duration?.message} {...register('duration')} />
              <FormSelect
                control={control}
                name="modality"
                label="Modalidade"
                options={[
                  { value: 'online', label: 'Online' },
                  { value: 'presencial', label: 'Presencial' },
                ]}
                hint="Alternativa: presencial"
              />
              <TextField
                label="Local (apenas presencial)"
                disabled={!presencial}
                placeholder={presencial ? 'Ex.: Luanda' : 'Não aplicável — serviço online'}
                hint="Indica um local de atendimento, nunca uma morada pessoal."
                {...register('place')}
              />
              <TextAreaField label="Disponibilidade" rows={3} hint="Hora de Angola (UTC+1). Horários sujeitos a confirmação." {...register('availability')} />
              <TextAreaField label="Condições e cancelamento" rows={3} {...register('conditions')} />
            </div>
          </section>

          <section className="card p-6 pb-[24px]">
            <h2 className="display text-[24px] leading-8">Publicação e contacto</h2>
            <div className="mt-[22px] space-y-[20px]">
              <FormSelect
                control={control}
                name="state"
                label="Estado de publicação"
                options={Object.entries(stateLabel).map(([value, label]) => ({ value, label }))}
                hint="Opções: Rascunho · Publicado · Desactivado"
              />
              <CheckField
                label="Mostrar Contactar pelo WhatsApp neste serviço, apenas se o consentimento do perfil estiver autorizado."
                disabled={!consent}
                {...register('showWhatsApp')}
              />
              {!consent && (
                <Notice tone="warn" title="WhatsApp não autorizado neste estado">
                  O botão não aparece na pré-visualização porque não existe consentimento activo no perfil. Não é inventado um número de contacto.
                </Notice>
              )}
            </div>
            <div className="mt-[22px] flex flex-wrap gap-3">
              <button type="button" className="btn" disabled={isSubmitting} onClick={() => submitWith('rascunho')}>
                Guardar rascunho
              </button>
              <button type="button" className="btn btn-primary" disabled={isSubmitting} onClick={() => submitWith('publicado')}>
                Publicar serviço
              </button>
              <button type="button" className="btn" disabled={isSubmitting || isNew} onClick={() => setConfirm(true)}>
                Desactivar
              </button>
            </div>
            {env.demoMode && <p className="small mt-[20px] text-[13px]">Ambiente de demonstração: nenhum serviço real é publicado ou desactivado.</p>}
          </section>
        </div>

        <aside className="space-y-[24px]">
          <section className="card p-6 pb-[22px]">
            <p className="eyebrow !font-bold !text-[11px]">Pré-visualização do cartão</p>
            <Dot tone="gray" className="mt-[20px]">
              {v.kind === 'curso' ? 'Curso em grupo' : 'Mentoria individual'}
            </Dot>
            <h2 className="display mt-[20px] text-[26px] leading-8">{v.title || 'Título do serviço'}</h2>
            <p className="mt-[18px] text-[15px] text-muted">
              {mentorName} · {env.demoMode ? 'Pessoa fictícia' : 'Mentor'}
            </p>
            <Dot tone="amber" className="mt-[18px]">
              {profile.data?.verification === 'verificado' ? 'Perfil verificado' : 'Verificação pendente'}
            </Dot>
            <p className="mt-[18px] text-[15px] leading-[21px]">
              {presencial ? `Presencial${v.place ? ` · ${v.place}` : ''}` : 'Online'} · {v.duration.replace(' por sessão', '')}
              <br />
              {v.availability.split(' · ')[0]}
            </p>
            <p className="mt-[20px] text-[30px] font-bold leading-9">{formatKz(Number(v.price) || 0)}</p>
            <p className="mt-[8px] text-[13px] text-muted">AOA · por sessão</p>
            <hr className="my-[18px] border-0 border-t border-line" />
            <p className="small text-[13px]">
              {consent && v.showWhatsApp ? 'Botão «Contactar pelo WhatsApp» visível quando publicado.' : 'Contacto oculto por falta de autorização.'}
            </p>
          </section>
          {env.demoMode && (
            <Notice tone="info" className="!p-6">
              <span className="notice-title !text-[12px] !font-bold uppercase tracking-[0.01em]">Nota de implementação · não pública</span>
              <span className="mt-[16px] block text-[13.5px] leading-[19px] text-ink">
                Destino oficial, sem ligação funcional:
                <br />
                https://wa.me/NUMERO?text=MENSAGEM
              </span>
              <span className="mt-[16px] block">
                Número internacional apenas com dígitos; incluir 244 quando aplicável, sem +, espaços ou traços. Não preencher com um número pessoal inventado.
              </span>
              <span className="mt-[16px] block">
                A mensagem deve incluir o nome do serviço e um pedido de informações, codificados para URL. Exemplo de texto: “Olá, gostaria de informações sobre{' '}
                {v.title || 'o serviço'}.”
              </span>
              <span className="mt-[16px] block">Só renderizar o CTA com autorização explícita do perfil e do serviço.</span>
            </Notice>
          )}
        </aside>
      </form>

      <ConfirmDialog
        open={confirm}
        title="Desactivar este serviço?"
        confirmLabel="Desactivar"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false)
          submitWith('desactivado')
        }}
      >
        O serviço deixa de estar visível ao público. Podes voltar a publicá-lo mais tarde.
      </ConfirmDialog>
    </>
  )
}
