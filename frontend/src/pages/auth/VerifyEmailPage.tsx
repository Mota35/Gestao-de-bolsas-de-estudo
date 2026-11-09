import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthShell, AuthTitle } from '../../layouts/AuthShell'
import { getErrorMessage } from '../../lib/errors'
import { authService } from '../../services'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [state, setState] = useState<'ready' | 'success' | 'error'>('ready')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const confirm = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) {
      setState('error')
      setMessage('O link não contém um código de confirmação. Inicia sessão e pede um novo email no teu painel de mentor.')
      return
    }
    setBusy(true)
    try {
      await authService.verifyEmail(token)
      setState('success')
      setMessage('Email confirmado. Já podes continuar a usar a tua conta.')
    } catch (error) {
      setState('error')
      setMessage(`${getErrorMessage(error)} Podes iniciar sessão e pedir um novo link no painel de mentor.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <AuthTitle title="Confirmar email" subtitle="Confirma que tens acesso ao endereço de email associado à conta." />
      {message && <p className={`mt-5 text-sm ${state === 'error' ? 'text-red-700' : 'text-green'}`} role="status">{message}</p>}
      {state === 'ready' && (
        <form onSubmit={confirm} className="mt-6">
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'A confirmar…' : 'Confirmar email'}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/entrar" className="underline underline-offset-2">Ir para iniciar sessão</Link>
      </p>
    </AuthShell>
  )
}
