import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CheckField, SelectField, TextField } from '../../components/ui/Field'
import { Dot, Notice } from '../../components/ui/Notice'
import { ErrorState, Loading } from '../../components/ui/States'
import { useAuth } from '../../contexts/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'
import { env } from '../../lib/env'
import { getErrorMessage } from '../../lib/errors'
import { authService, studentService } from '../../services'
import type { Preferences } from '../../types'

export default function StudentAccountPage() {
  useDocumentTitle('Conta e preferências')
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const prefs = useAsync(() => studentService.preferences(), [])
  const profile = useAsync(() => studentService.profile(), [])
  const [form, setForm] = useState<Preferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (prefs.data) setForm(prefs.data)
  }, [prefs.data])

  if (prefs.loading || profile.loading) return <Loading />
  if (prefs.error || !form) return <ErrorState message={prefs.error ?? 'Não foi possível carregar as preferências.'} onRetry={prefs.reload} />
  const set = <K extends keyof Preferences>(k: K, v: Preferences[K]) => setForm({ ...form, [k]: v })

  const save = async () => {
    setSaving(true)
    try {
      await studentService.savePreferences(form)
      toast.success('Preferências guardadas.')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }
  const requestData = async (kind: 'copia' | 'eliminacao') => {
    try {
      await studentService.requestData(kind)
      toast.success(kind === 'copia' ? 'Pedido de cópia registado.' : 'Pedido de eliminação registado.')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }
  const requestPassword = async () => {
    try {
      await authService.forgotPassword(profile.data?.email ?? user?.email ?? '')
      toast.success('Se existir uma conta associada a este email, receberás instruções para definir uma nova senha.')
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }
  const signOut = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <>
      <DashHead title="Conta e preferências" subtitle="Escolhe como queres usar a plataforma e mantém o controlo dos teus dados." />
      <div className="grid items-start gap-7 lg:grid-cols-[1fr_350px]">
        <div className="space-y-[24px]">
          <section className="card p-6 pb-[24px]">
            <h2 className="display text-[24px] leading-8">Contacto e idioma</h2>
            <div className="mt-[22px] space-y-[16px]">
              <TextField
                label="Email de contacto"
                value={profile.data?.email ?? user?.email ?? ''}
                readOnly
                hint={env.demoMode ? 'Email fictício. Qualquer mudança real requer validação pela API.' : 'Qualquer mudança requer validação pela API.'}
              />
              <SelectField
                label="Idioma da interface"
                value={form.language}
                onChange={(v) => set('language', v as Preferences['language'])}
                options={[
                  { value: 'pt', label: 'Português (PT)' },
                  { value: 'en', label: 'English (EN)' },
                ]}
                hint="Alternativa visual disponível: English (EN)."
              />
            </div>
            <button type="button" className="btn btn-primary mt-[16px]" onClick={save} disabled={saving}>
              {saving ? 'A guardar…' : 'Guardar preferências'}
            </button>
          </section>

          <section className="card p-6 pb-[22px]">
            <h2 className="display text-[24px] leading-8">Notificações</h2>
            <div className="mt-[18px] space-y-[14px]">
              <CheckField
                label="Novas oportunidades relacionadas com o meu perfil"
                checked={form.notifyOpportunities}
                onChange={(e) => set('notifyOpportunities', e.target.checked)}
              />
              <CheckField label="Lembretes de prazos das bolsas guardadas" checked={form.notifyDeadlines} onChange={(e) => set('notifyDeadlines', e.target.checked)} />
              <CheckField label="Novidades de cursos e mentorias" checked={form.notifyCourses} onChange={(e) => set('notifyCourses', e.target.checked)} />
              <CheckField label="Comunicações opcionais da plataforma" checked={form.notifyOptional} onChange={(e) => set('notifyOptional', e.target.checked)} />
            </div>
            <p className="small mt-[16px] text-[13px]">
              Podes retirar consentimentos opcionais a qualquer momento.{env.demoMode ? ' Nenhuma notificação é enviada neste design.' : ''}
            </p>
            <button type="button" className="btn btn-sm mt-[14px]" onClick={save} disabled={saving}>
              Guardar notificações
            </button>
          </section>

          <section className="card p-6 pb-[24px]">
            <h2 className="display text-[24px] leading-8">Privacidade</h2>
            <CheckField
              className="mt-[18px]"
              label="Permitir sugestões com base nos dados académicos do meu perfil"
              checked={form.allowSuggestions}
              onChange={(e) => set('allowSuggestions', e.target.checked)}
            />
            <p className="mt-[20px] text-[15.5px] leading-[21px] text-muted">
              O perfil do estudante não é público. Não vendemos acesso aos teus documentos e não os pedimos nesta plataforma.
            </p>
            <div className="mt-[16px] flex flex-wrap gap-3">
              <button type="button" className="btn btn-sm" onClick={() => requestData('copia')}>
                Pedir cópia dos meus dados
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setConfirmDelete(true)}>
                Pedir eliminação da conta
              </button>
            </div>
          </section>
        </div>

        <aside className="space-y-[24px]">
          <section className="card p-6">
            <h2 className="display text-[24px] leading-8">Segurança da conta</h2>
            {env.demoMode && (
              <Dot tone="gray" className="mt-[16px]">
                Estado de demonstração
              </Dot>
            )}
            <p className="mt-[16px] text-[14.5px] leading-[21px] text-muted">
              Para alterar a senha, pede instruções de recuperação. A alteração real depende de validação no backend.
            </p>
            <button type="button" className="btn btn-block mt-[16px]" onClick={requestPassword}>
              Pedir alteração de senha
            </button>
            <hr className="my-[16px] border-0 border-t border-line" />
            <h3 className="display text-[18px] leading-7">Sair da conta</h3>
            <p className="mt-[16px] text-[13.5px] leading-5 text-muted">Ao terminares num dispositivo partilhado, fecha a sessão.</p>
            <button type="button" className="btn btn-block mt-[14px]" onClick={signOut}>
              Terminar sessão
            </button>
          </section>
          <Notice tone="warn" title="A tua senha é privada">
            O suporte nunca pede a tua senha ou códigos de recuperação. Não partilhes esses dados por WhatsApp ou email.
          </Notice>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Pedir a eliminação da conta?"
        confirmLabel="Pedir eliminação"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          void requestData('eliminacao')
        }}
      >
        O pedido é registado e tratado pela equipa. A tua conta e os dados associados serão eliminados, de acordo com a política de privacidade.
      </ConfirmDialog>
    </>
  )
}
