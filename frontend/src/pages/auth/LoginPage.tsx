import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckField, PasswordField, TextField } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'
import { useAuth, homeForRole } from '../../contexts/AuthContext'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { AuthShell, AuthTitle } from '../../layouts/AuthShell'
import { env } from '../../lib/env'
import { loginSchema, type LoginForm } from '../../schemas'

export default function LoginPage() {
  useDocumentTitle('Iniciar sessão')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [show, setShow] = useState(false)
  const [failed, setFailed] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  const onSubmit = handleSubmit(async (data) => {
    setFailed(false)
    try {
      const user = await login(data.email.trim(), data.password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/entrar' ? from : homeForRole(user.role), { replace: true })
    } catch {
      // Mensagem neutra: não revela se o email existe nem qual dos dados falhou.
      setFailed(true)
      toast.error('Não foi possível iniciar sessão.')
    }
  })

  return (
    <AuthShell>
      <AuthTitle title="Bem-vindo de volta" subtitle="Entra para consultar o teu perfil e as oportunidades guardadas." />
      <form onSubmit={onSubmit} noValidate className="mt-[24px]">
        <TextField label="Email" type="email" autoComplete="email" placeholder="nome@exemplo.com" error={errors.email?.message} {...register('email')} />
        <PasswordField className="mt-[22px]" label="Senha" autoComplete="current-password" visible={show} error={errors.password?.message} {...register('password')} />
        <div className="mt-[22px] flex flex-wrap items-center justify-between gap-3">
          <CheckField label="Mostrar senha" checked={show} onChange={(e) => setShow(e.target.checked)} />
          <Link to="/recuperar-senha" className="text-[14px] text-green hover:underline">
            Recuperar senha
          </Link>
        </div>
        {failed && (
          <Notice tone="error" title="Não foi possível iniciar sessão" className="mt-[22px]">
            Verifica o email e a senha e tenta novamente. A mensagem não indica se a conta existe.
          </Notice>
        )}
        <button type="submit" className="btn btn-primary btn-block mt-[22px]" disabled={isSubmitting}>
          {isSubmitting ? 'A entrar…' : 'Iniciar sessão'}
        </button>
      </form>
      <p className="mt-[24px] text-center text-[14px] text-green">
        <Link to="/registo" className="hover:underline">
          Ainda não tens conta? Criar conta
        </Link>
      </p>
      <p className="small mt-[24px] text-[13px]">Não partilhes a tua senha.{env.demoMode && ' Este ambiente é de demonstração: não existem credenciais reais.'}</p>
      {env.demoMode && (
        <Notice tone="info" title="Contas de demonstração" className="mt-4">
          ana@estudante.example (estudante) · celina@mentor.example (mentor) · lidia@admin.example (administração). Usa qualquer senha com 12 ou mais caracteres.
        </Notice>
      )}
    </AuthShell>
  )
}
