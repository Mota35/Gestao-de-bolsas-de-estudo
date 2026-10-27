import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckField, PasswordField, TextField } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { AuthShell, AuthTitle } from '../../layouts/AuthShell'
import { env } from '../../lib/env'
import { getErrorMessage } from '../../lib/errors'
import { registerSchema, type RegisterForm } from '../../schemas'
import { authService } from '../../services'

export default function RegisterPage() {
  useDocumentTitle('Criar conta')
  const navigate = useNavigate()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'estudante', name: '', email: '', password: '', confirm: '', terms: false, newsletter: false },
  })

  const onSubmit = handleSubmit(async (d) => {
    try {
      await authService.register({ name: d.name.trim(), email: d.email.trim(), password: d.password, role: d.role, newsletter: !!d.newsletter })
      toast.success('Conta criada. Já podes iniciar sessão.')
      navigate('/entrar', { replace: true })
    } catch (e) {
      const message = getErrorMessage(e)
      toast.error(message)
      setError('email', { message })
    }
  })

  return (
    <AuthShell>
      <AuthTitle title="Cria a tua conta" subtitle="Escolhe como queres participar na Kwanza Oportunidades." />
      <form onSubmit={onSubmit} noValidate className="mt-[24px]">
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Tipo de conta" className="grid grid-cols-2 gap-3">
              {(
                [
                  ['estudante', 'Sou estudante'],
                  ['mentor', 'Sou mentor'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={field.value === value}
                  className={`btn ${field.value === value ? 'btn-primary' : ''}`}
                  onClick={() => field.onChange(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        />
        <TextField className="mt-[22px]" label="Nome" autoComplete="name" placeholder="Como te chamas?" error={errors.name?.message} {...register('name')} />
        <TextField
          className="mt-[22px]"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="nome@exemplo.com"
          hint={env.demoMode ? 'Endereço fictício de demonstração.' : undefined}
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          className="mt-[22px]"
          label="Senha"
          eye
          hint="Usa pelo menos 12 caracteres, com letras e números."
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordField className="mt-[22px]" label="Confirmar senha" eye error={errors.confirm?.message} {...register('confirm')} />
        <div className="mt-[22px] space-y-[18px]">
          <CheckField
            label={
              <>
                Li e aceito os{' '}
                <Link to="/termos" className="underline underline-offset-2">
                  Termos de utilização
                </Link>{' '}
                e a{' '}
                <Link to="/privacidade" className="underline underline-offset-2">
                  Política de privacidade
                </Link>
                .
              </>
            }
            error={errors.terms?.message}
            {...register('terms')}
          />
          <CheckField label="Quero receber novidades sobre oportunidades por email. (Opcional)" {...register('newsletter')} />
        </div>
        <Notice tone="info" title="Só os dados necessários" className="mt-[22px]">
          Não pedimos documentos pessoais. Mentores completam o perfil profissional após o registo; o pagamento não verifica perfis.
        </Notice>
        <button type="submit" className="btn btn-primary btn-block mt-[22px]" disabled={isSubmitting}>
          {isSubmitting ? 'A criar conta…' : 'Criar conta'}
        </button>
      </form>
      <p className="mt-[24px] text-center text-[14px] text-green">
        <Link to="/entrar" className="hover:underline">
          Já tens conta? Iniciar sessão
        </Link>
      </p>
      <p className="small mt-[24px] text-[13px]">
        {env.demoMode ? 'Ambiente de demonstração: a conta é fictícia e só existe durante esta sessão do navegador.' : 'A tua senha nunca é guardada no navegador.'}
      </p>
    </AuthShell>
  )
}
