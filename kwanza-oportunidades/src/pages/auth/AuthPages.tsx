import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import {
  forgotSchema, loginSchema, registerSchema, resetPasswordSchema,
  type ForgotInput, type LoginInput, type RegisterInput, type ResetPasswordInput,
} from '../../schemas'
import { authService } from '../../services/auth'
import { ApiError, errorMessage } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { SelectField, TextField } from '../../components/ui'
import type { Role } from '../../types'

function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold text-brand-700">{title}</h1>
      <div className="card">{children}</div>
    </div>
  )
}

function homeFor(role: Role) {
  return role === 'admin' ? '/admin' : role === 'mentor' ? '/mentor' : '/estudante'
}

export function LoginPage() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginInput) {
    try {
      const user = await authService.login(values)
      setUser(user)
      toast.success('Sessão iniciada.')
      navigate(from ?? homeFor(user.role), { replace: true })
    } catch (e) {
      const msg = e instanceof ApiError && (e.status === 401 || e.status === 422) ? 'Email ou senha incorrectos.' : errorMessage(e)
      setError('root', { message: msg })
      toast.error(msg)
    }
  }

  return (
    <AuthShell title="Iniciar sessão">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {errors.root && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.root.message}</p>}
        <TextField label="Email" type="email" autoComplete="email" error={errors.email} {...register('email')} />
        <TextField label="Senha" type="password" autoComplete="current-password" error={errors.password} {...register('password')} />
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'A entrar…' : 'Entrar'}</button>
        <div className="flex justify-between text-sm">
          <Link to="/recuperar-senha" className="text-brand-600 hover:underline">Recuperar senha</Link>
          <Link to="/registo" className="text-brand-600 hover:underline">Criar conta</Link>
        </div>
      </form>
    </AuthShell>
  )
}

export function RegisterPage() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'student' },
  })

  async function onSubmit(values: RegisterInput) {
    try {
      const { confirmPassword: _c, acceptTerms: _a, ...payload } = values
      const user = await authService.register(payload)
      setUser(user)
      toast.success('Conta criada com sucesso.')
      navigate(homeFor(user.role), { replace: true })
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError('email', { message: 'Já existe uma conta com este email.' })
      } else if (e instanceof ApiError && e.status === 422 && e.fieldErrors) {
        for (const [field, msgs] of Object.entries(e.fieldErrors)) {
          if (field in values) setError(field as keyof RegisterInput, { message: msgs[0] })
        }
      }
      toast.error(errorMessage(e))
    }
  }

  return (
    <AuthShell title="Criar conta">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <SelectField label="Tipo de conta" error={errors.role} {...register('role')}>
          <option value="student">Estudante</option>
          <option value="mentor">Mentor</option>
        </SelectField>
        <TextField label="Nome completo" autoComplete="name" error={errors.name} {...register('name')} />
        <TextField label="Email" type="email" autoComplete="email" error={errors.email} {...register('email')} />
        <TextField label="Senha" type="password" autoComplete="new-password" hint="Mínimo de 8 caracteres, com letras e números." error={errors.password} {...register('password')} />
        <TextField label="Confirmar senha" type="password" autoComplete="new-password" error={errors.confirmPassword} {...register('confirmPassword')} />
        <div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" {...register('acceptTerms')} />
            <span>Aceito os termos de utilização e a política de privacidade.</span>
          </label>
          {errors.acceptTerms && <p className="field-error" role="alert">{errors.acceptTerms.message}</p>}
        </div>
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'A criar…' : 'Criar conta'}</button>
        <p className="text-center text-sm">Já tem conta? <Link to="/entrar" className="text-brand-600 hover:underline">Iniciar sessão</Link></p>
      </form>
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const [done, setDone] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotInput>({ resolver: zodResolver(forgotSchema) })

  async function onSubmit(values: ForgotInput) {
    try {
      await authService.forgotPassword(values.email)
      setDone(true)
    } catch (e) {
      // 404/409 não devem revelar se o email existe: apenas falhas reais são mostradas.
      if (e instanceof ApiError && (e.status === 404 || e.status === 409 || e.status === 422)) setDone(true)
      else toast.error(errorMessage(e))
    }
  }

  return (
    <AuthShell title="Recuperar senha">
      {done ? (
        <div role="status" className="space-y-3 text-slate-700">
          <p>Se existir uma conta associada a este email, enviámos instruções para definir uma nova senha.</p>
          <Link to="/entrar" className="btn-outline">Voltar ao início de sessão</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <p className="text-sm text-slate-600">Indique o email da sua conta.</p>
          <TextField label="Email" type="email" autoComplete="email" error={errors.email} {...register('email')} />
          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'A enviar…' : 'Enviar instruções'}</button>
        </form>
      )}
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  if (!token) {
    return (
      <AuthShell title="Nova senha">
        <p role="alert" className="text-slate-700">Link inválido ou incompleto. Peça uma nova recuperação de senha.</p>
        <Link to="/recuperar-senha" className="btn-primary mt-4">Recuperar senha</Link>
      </AuthShell>
    )
  }

  async function onSubmit(values: ResetPasswordInput) {
    try {
      await authService.resetPassword({ token, password: values.password })
      toast.success('Senha alterada. Inicie sessão com a nova senha.')
      navigate('/entrar', { replace: true })
    } catch (e) {
      const msg = e instanceof ApiError && (e.status === 400 || e.status === 404 || e.status === 422)
        ? 'O link expirou ou é inválido. Peça uma nova recuperação de senha.'
        : errorMessage(e)
      setError('root', { message: msg })
      toast.error(msg)
    }
  }

  return (
    <AuthShell title="Nova senha">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {errors.root && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.root.message}</p>}
        <TextField label="Nova senha" type="password" autoComplete="new-password" hint="Mínimo de 8 caracteres, com letras e números." error={errors.password} {...register('password')} />
        <TextField label="Confirmar nova senha" type="password" autoComplete="new-password" error={errors.confirmPassword} {...register('confirmPassword')} />
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'A guardar…' : 'Guardar nova senha'}</button>
      </form>
    </AuthShell>
  )
}
