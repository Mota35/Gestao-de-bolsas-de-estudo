import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, KeyRound, Mail, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { TextField } from '../../components/ui/Field'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { AuthShell } from '../../layouts/AuthShell'
import { env } from '../../lib/env'
import { getErrorMessage } from '../../lib/errors'
import { authService } from '../../services'

export default function ForgotPasswordPage() {
  useDocumentTitle('Recuperar senha')
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)

  async function requestCode(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await authService.forgotPassword(email.trim())
      setStep('code')
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setBusy(false) }
  }

  async function confirmCode(event: FormEvent) {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) return toast.error('Introduz o código de 6 dígitos.')
    setBusy(true)
    try {
      const result = await authService.verifyResetCode(email.trim(), code)
      navigate(`/nova-senha?token=${encodeURIComponent(result.token)}`)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setBusy(false) }
  }

  const isCodeStep = step === 'code'
  return (
    <AuthShell>
      <div className="mb-7 flex items-center justify-between">
        <Link to="/entrar" aria-label="Voltar ao início de sessão" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:bg-mist"><ArrowLeft size={18} /></Link>
        <span className="rounded-full bg-mist px-3 py-1.5 text-xs font-semibold text-muted">Recuperação segura</span>
      </div>

      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-mint text-green shadow-sm">
        {isCodeStep ? <KeyRound size={25} strokeWidth={1.8} /> : <Mail size={25} strokeWidth={1.8} />}
      </div>
      <p className="eyebrow mb-2">Acesso à tua conta</p>
      <h1 className="display text-[30px] leading-tight tracking-tight max-sm:text-[26px]">{isCodeStep ? 'Confirma o teu email' : 'Vamos recuperar a tua senha'}</h1>
      <p className="mt-3 text-[15px] leading-6 text-muted">{isCodeStep ? <>Enviámos um código de acesso para <span className="font-semibold text-ink">{email}</span>. Introduz os seis dígitos para continuar.</> : 'Indica o email associado à conta. Vais receber um código para confirmar que és tu.'}</p>

      <div className="mt-7 grid grid-cols-2 gap-2" aria-label={`Passo ${isCodeStep ? '2' : '1'} de 2`}>
        <div className={`h-1.5 rounded-full ${isCodeStep ? 'bg-green' : 'bg-green'}`} />
        <div className={`h-1.5 rounded-full transition-colors ${isCodeStep ? 'bg-green' : 'bg-line'}`} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-muted"><span>Email</span><span>Código</span></div>

      {isCodeStep ? <form onSubmit={confirmCode} className="mt-7">
        <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="reset-code">Código de verificação</label>
        <TextField id="reset-code" label="" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="[&_label]:!min-h-0 [&_label]:!border-0 [&_label]:!bg-transparent [&_label]:!p-0 [&_label]:!shadow-none [&_label>span:first-child]:hidden [&_input]:!h-[66px] [&_input]:!rounded-xl [&_input]:!border [&_input]:!border-line [&_input]:!bg-mist/60 [&_input]:!px-4 [&_input]:!text-center [&_input]:!text-[28px] [&_input]:!font-bold [&_input]:!tracking-[0.55em] [&_input]:focus:!border-green [&_input]:focus:!bg-white" required />
        <p className="mt-2 text-xs leading-5 text-muted">O código pode demorar um pouco. Verifica também a pasta de spam.</p>
        <button type="submit" className="btn btn-primary btn-block mt-6 !min-h-[52px] !rounded-xl" disabled={busy || code.length !== 6}>{busy ? 'A confirmar…' : <>Confirmar código <ArrowRight size={17} /></>}</button>
        <button type="button" className="mt-4 w-full py-2 text-sm font-semibold text-green transition hover:underline" disabled={busy} onClick={requestCode}>{busy ? 'A enviar…' : 'Não recebeste? Reenviar código'}</button>
        {env.demoMode && <p className="mt-3 rounded-xl bg-sand p-3 text-xs leading-5 text-muted">Modo de demonstração: a confirmação e o envio real requerem o backend configurado.</p>}
      </form> : <form onSubmit={requestCode} className="mt-7">
        <TextField label="Email" type="email" autoComplete="email" placeholder="nome@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
        <button type="submit" className="btn btn-primary btn-block mt-5 !min-h-[52px] !rounded-xl" disabled={busy || !email.trim()}>{busy ? 'A enviar…' : <>Enviar código <ArrowRight size={17} /></>}</button>
      </form>}

      <div className="mt-7 flex items-start gap-3 rounded-xl border border-line/70 bg-mist/60 p-4">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-green" />
        <p className="text-xs leading-5 text-muted">A tua segurança importa. O código é temporário e só pode ser utilizado uma vez.</p>
      </div>
      <p className="mt-6 text-center text-sm text-muted">Lembraste da senha? <Link to="/entrar" className="font-semibold text-green hover:underline">Entrar na conta</Link></p>
    </AuthShell>
  )
}
