import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { TextField } from '../../components/ui/Field'
import { Dot, Notice } from '../../components/ui/Notice'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { AuthShell, AuthTitle } from '../../layouts/AuthShell'
import { env } from '../../lib/env'
import { getErrorMessage } from '../../lib/errors'
import { forgotSchema, type ForgotForm } from '../../schemas'
import { authService } from '../../services'

/** Resposta neutra: nunca revela se o email está registado. */
function NeutralNotice({ demoNote }: { demoNote: boolean }) {
  return (
    <>
      <Notice tone="info" title="Pedido de recuperação — resposta neutra" className="mt-[22px]">
        Se existir uma conta associada a este email, receberá instruções para definir uma nova senha.
      </Notice>
      {demoNote && (
        <p className="small mt-[22px] text-[13px]">
          Esta mensagem representa a resposta esperada do backend. Não foi enviado qualquer email e não está representada uma recuperação concluída.
        </p>
      )}
      <p className="small mt-[20px] text-[13px]">
        A recuperação real depende exclusivamente da API. Nenhuma senha ou token é guardado {env.demoMode ? 'neste design' : 'no navegador'}.
      </p>
    </>
  )
}

export default function ForgotPasswordPage() {
  useDocumentTitle('Recuperar senha')
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } })

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await authService.forgotPassword(email.trim())
      setSent(true)
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  })

  return (
    <AuthShell>
      <AuthTitle title="Recuperar senha" subtitle="Indica o email da tua conta para pedir instruções de recuperação." />
      <Dot tone="gray" className="mt-[26px]">
        Estado: {sent ? 'pedido enviado' : 'pedido'}
      </Dot>
      <form onSubmit={onSubmit} noValidate className="mt-[17px]">
        <TextField label="Email" type="email" autoComplete="email" placeholder="nome@exemplo.com" error={errors.email?.message} {...register('email')} />
        <button type="submit" className="btn btn-primary btn-block mt-[22px]" disabled={isSubmitting}>
          {isSubmitting ? 'A enviar…' : 'Pedir instruções'}
        </button>
      </form>
      <p className="mt-[24px] text-center text-[14px] text-green">
        <Link to="/entrar" className="hover:underline">
          Voltar ao início de sessão
        </Link>
      </p>

      {sent && <NeutralNotice demoNote={env.demoMode} />}
      {!sent && env.demoMode && (
        <div className="mt-[24px] border-t border-line pt-[24px]">
          <p className="text-[12px] font-bold uppercase tracking-[0.01em] text-label">Estado alternativo · resposta esperada da API</p>
          <NeutralNotice demoNote />
        </div>
      )}
    </AuthShell>
  )
}
