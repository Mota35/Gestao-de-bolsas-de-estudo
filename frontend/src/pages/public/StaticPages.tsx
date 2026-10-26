import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { contactSchema, type ContactInput } from '../../schemas'
import { supportService } from '../../services/support'
import { errorMessage } from '../../services/api'
import { PageHeader, TextAreaField, TextField } from '../../components/ui'

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Sobre nós" />
      <p className="text-slate-700">
        A Kwanza Oportunidades (nome provisório) nasceu para facilitar o acesso de estudantes angolanos a
        bolsas de estudo e a mentorias de qualidade.
      </p>
      <p className="text-slate-700">
        Cada oportunidade mostra a sua fonte e o seu estado de verificação: verificada, pendente de
        verificação ou expirada. Nunca apresentamos uma bolsa expirada como aberta.
      </p>
      <p className="text-slate-700">
        Os mentores são responsáveis pelas informações que publicam. Perfis ainda não verificados são
        sempre identificados como tal. Recomendamos confirmar os dados na fonte oficial antes de
        qualquer candidatura ou pagamento.
      </p>
      <Link to="/bolsas" className="btn-primary">Explorar bolsas</Link>
    </div>
  )
}

export function ContactPage() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
  })

  async function onSubmit(values: ContactInput) {
    try {
      await supportService.sendMessage(values)
      toast.success('Mensagem enviada. Responderemos em breve.')
      setSent(true)
      reset()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Contactos e suporte" subtitle="Envie-nos uma mensagem e responderemos por email." />
      {sent && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">A sua mensagem foi enviada.</p>}
      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4" noValidate>
        <TextField label="Nome" autoComplete="name" error={errors.name} {...register('name')} />
        <TextField label="Email" type="email" autoComplete="email" error={errors.email} {...register('email')} />
        <TextField label="Assunto" error={errors.subject} {...register('subject')} />
        <TextAreaField label="Mensagem" error={errors.message} {...register('message')} />
        <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'A enviar…' : 'Enviar mensagem'}</button>
      </form>
    </div>
  )
}

const faqs: [string, string][] = [
  ['A plataforma garante que as bolsas são verdadeiras?', 'Cada oportunidade indica a fonte e se foi verificada pela nossa equipa. Mesmo assim, confirme sempre os dados na fonte oficial antes de se candidatar.'],
  ['O que significa "pendente de verificação"?', 'Significa que a informação foi recolhida mas ainda não foi confirmada pela equipa. Trate-a com cautela.'],
  ['As candidaturas são feitas na plataforma?', 'As candidaturas são feitas nos sites oficiais das instituições. Quando o recurso estiver disponível, poderá acompanhar aqui as candidaturas registadas.'],
  ['Como contacto um mentor?', 'Se o mentor autorizou a divulgação do contacto, aparece o botão «Contactar pelo WhatsApp» no perfil e nos serviços.'],
  ['Como funcionam os pagamentos das mentorias?', 'Os preços e condições são definidos por cada mentor. A plataforma não processa pagamentos; combine directamente com o mentor e desconfie de perfis não verificados.'],
  ['Esqueci-me da senha. O que faço?', 'Use a opção «Recuperar senha» na página de início de sessão. Enviaremos instruções para o email, se existir uma conta associada.'],
]

export function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Perguntas frequentes" />
      <div className="space-y-3">
        {faqs.map(([q, a]) => (
          <details key={q} className="card group">
            <summary className="cursor-pointer font-semibold text-brand-700">{q}</summary>
            <p className="mt-2 text-slate-700">{a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-6xl font-bold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-800">Página não encontrada</h1>
      <p className="mt-2 text-slate-600">O endereço que procura não existe ou foi movido.</p>
      <Link to="/" className="btn-primary mt-6">Voltar ao início</Link>
    </div>
  )
}
