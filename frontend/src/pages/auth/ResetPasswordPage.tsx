import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { CheckList } from '../../components/ui/CheckList'
import { CheckField, PasswordField } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { AuthShell, AuthTitle } from '../../layouts/AuthShell'
import { env } from '../../lib/env'
import { getErrorMessage } from '../../lib/errors'
import { resetSchema, type ResetForm } from '../../schemas'
import { authService } from '../../services'

function InvalidRequest({ annotated }: { annotated: boolean }) {
  return (
    <div className={annotated ? 'mt-[24px] border-t border-line pt-[24px]' : 'mt-[24px]'}>
      {annotated && <p className="text-[12px] font-bold uppercase tracking-[0.01em] text-label">Estado alternativo · token inválido ou expirado</p>}
      <Notice tone="warn" title="Este pedido já não é válido" className={annotated ? 'mt-[22px]' : ''}>
        O pedido pode ter expirado ou já ter sido utilizado. Solicita novas instruções de recuperação para continuar.
      </Notice>
      <Link to="/recuperar-senha" className="btn btn-block mt-[22px]">
        Fazer novo pedido
      </Link>
      <p className="small mt-[22px] text-[13px]">
        A API valida o token e altera a senha;{' '}
        {env.demoMode ? 'este design não guarda tokens ou senhas nem representa sucesso real.' : 'o navegador nunca guarda tokens ou senhas.'}
      </p>
    </div>
  )
}

export default function ResetPasswordPage() {
  useDocumentTitle('Nova senha')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [show, setShow] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirm: '' } })

  const onSubmit = handleSubmit(async ({ password }) => {
    if (!token && !env.demoMode) return setInvalid(true)
    try {
      await authService.resetPassword({ token, password })
      toast.success('Senha alterada. Inicia sessão com a nova senha.')
      navigate('/entrar', { replace: true })
    } catch (e) {
      // 400/404/409/422: pedido inválido, expirado ou já utilizado. Nunca se simula sucesso.
      if (axios.isAxiosError(e) && [400, 404, 409, 410, 422].includes(e.response?.status ?? 0)) setInvalid(true)
      else toast.error(getErrorMessage(e))
    }
  })

  const showForm = (token || env.demoMode) && !invalid
  return (
    <AuthShell>
      <AuthTitle
        title="Define uma nova senha"
        subtitle={env.demoMode ? 'Estado de formulário para um pedido válido, a confirmar pela API.' : 'Escolhe uma nova senha para a tua conta.'}
      />
      {showForm && (
        <form onSubmit={onSubmit} noValidate className="mt-[24px]">
          <PasswordField label="Nova senha" visible={show} error={errors.password?.message} {...register('password')} />
          <PasswordField className="mt-[22px]" label="Confirmar nova senha" visible={show} error={errors.confirm?.message} {...register('confirm')} />
          <CheckField className="mt-[24px]" label="Mostrar senhas" checked={show} onChange={(e) => setShow(e.target.checked)} />
          <CheckList className="mt-[24px] !space-y-[6px]" items={['Pelo menos 12 caracteres.', 'Combina letras e números.', 'Escolhe uma senha que não uses noutros serviços.']} />
          <button type="submit" className="btn btn-primary btn-block mt-[22px]" disabled={isSubmitting}>
            {isSubmitting ? 'A guardar…' : 'Definir nova senha'}
          </button>
        </form>
      )}
      {(invalid || (!token && !env.demoMode)) && <InvalidRequest annotated={false} />}
      {showForm && env.demoMode && <InvalidRequest annotated />}
    </AuthShell>
  )
}
