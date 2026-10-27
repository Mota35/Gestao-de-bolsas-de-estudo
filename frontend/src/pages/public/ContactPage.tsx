import { zodResolver } from '@hookform/resolvers/zod'
import { GraduationCap, MessagesSquare, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckField, FormSelect, TextAreaField, TextField } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'
import { PageHeader } from '../../components/ui/PageHeader'
import { supportCategories } from '../../data/options'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { env } from '../../lib/env'
import { getErrorMessage, getFieldErrors } from '../../lib/errors'
import { supportSchema, type SupportForm } from '../../schemas'
import { supportService } from '../../services'

const topics = [
  { icon: GraduationCap, t: 'Bolsas e fontes', d: 'Prazos, elegibilidade e informação desactualizada.' },
  { icon: MessagesSquare, t: 'Cursos e mentorias', d: 'Preços, perfis e contacto autorizado.' },
  { icon: ShieldCheck, t: 'Conta e segurança', d: 'Acesso, privacidade e denúncias.' },
]

export default function ContactPage() {
  useDocumentTitle('Contactos e suporte')
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SupportForm>({
    resolver: zodResolver(supportSchema),
    defaultValues: { name: '', email: '', category: '', subject: '', message: '', consent: false },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await supportService.send(data)
      toast.success('Pedido recebido. Responderemos por email, sem prazo garantido.')
      reset()
    } catch (e) {
      const fe = getFieldErrors(e)
      Object.entries(fe).forEach(([k, v]) => setError(k as keyof SupportForm, { message: v }))
      toast.error(getErrorMessage(e))
    }
  })

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Início', to: '/' }, { label: 'Contactos e suporte', to: '/contactos' }, { label: 'Estamos aqui para orientar' }]}
        title="Estamos aqui para orientar"
        subtitle="Dúvidas sobre a plataforma, informação incorrecta ou um problema de segurança? Escolhe o tema e conta-nos o essencial."
      />
      <div className="bg-page pb-[40px] pt-[40px]">
        <div className="wrap grid items-start gap-10 lg:grid-cols-[390px_1fr]">
          <aside className="max-lg:order-2">
            <div className="space-y-[24px]">
              {topics.map(({ icon: Icon, t, d }) => (
                <article key={t} className="card p-6 pb-[28px]">
                  <Icon size={24} strokeWidth={1.6} className="text-green" aria-hidden />
                  <h2 className="mt-[19px] text-[20px] font-semibold leading-7 tracking-tight">{t}</h2>
                  <p className="mt-[16px] text-[14px] leading-5 text-muted">{d}</p>
                </article>
              ))}
            </div>
            <p className="mt-[24px] text-[13.5px] leading-5 text-muted">
              Canal de exemplo: {env.supportEmail}
              <br />
              Atendimento de referência: dias úteis, 09h00–17h00, hora de Angola. Sem prazo de resposta garantido.
            </p>
            <Link to="/perguntas-frequentes" className="btn mt-[22px]">
              Consultar perguntas frequentes
            </Link>
          </aside>

          <div className="max-lg:order-1">
            <section className="card p-8 max-sm:p-5" aria-labelledby="envia">
              <h2 id="envia" className="display text-[26px] leading-8">
                Envia a tua questão
              </h2>
              <form onSubmit={onSubmit} noValidate className="mt-[30px] space-y-[22px]">
                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField label="Nome" placeholder="Como te podemos tratar?" autoComplete="name" error={errors.name?.message} {...register('name')} />
                  <TextField label="Email para resposta" type="email" placeholder="nome@exemplo.com" autoComplete="email" error={errors.email?.message} {...register('email')} />
                </div>
                <FormSelect
                  control={control}
                  name="category"
                  label="Categoria de ajuda"
                  options={supportCategories}
                  placeholder="Seleccionar categoria"
                  error={errors.category?.message}
                />
                <TextField label="Assunto" placeholder="Resume a tua questão" error={errors.subject?.message} {...register('subject')} />
                <TextAreaField
                  label="Mensagem"
                  rows={4}
                  placeholder="Descreve a situação sem incluir dados sensíveis."
                  hint="Se for sobre uma bolsa ou serviço, indica apenas o título."
                  error={errors.message?.message}
                  {...register('message')}
                />
                <CheckField
                  label={
                    <>
                      Autorizo o tratamento destes dados apenas para responder ao pedido. Li a{' '}
                      <Link to="/privacidade" className="underline underline-offset-2">
                        política de privacidade
                      </Link>
                      .
                    </>
                  }
                  error={errors.consent?.message}
                  {...register('consent')}
                />
                <div>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'A enviar…' : 'Enviar pedido'}
                  </button>
                  {env.demoMode && <p className="small mt-[22px] text-[13px]">Representação visual. Nenhuma mensagem será enviada.</p>}
                </div>
              </form>
            </section>
            <Notice tone="warn" title="Protege a tua privacidade" className="mt-[24px]">
              Não incluas senha, número de identificação, documentos, dados bancários ou contactos de outras pessoas. Não pedimos pagamentos para resolver questões de suporte.
            </Notice>
          </div>
        </div>
      </div>
    </>
  )
}
