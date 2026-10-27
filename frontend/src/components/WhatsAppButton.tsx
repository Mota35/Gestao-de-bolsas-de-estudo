import { MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { buildWhatsAppUrl } from '../lib/format'

interface Props {
  /** Só deve ser passado quando o mentor autorizou a divulgação. */
  number?: string
  serviceTitle: string
  authorized: boolean
  variant?: 'primary' | 'outline'
  label?: string
  className?: string
  icon?: boolean
}

/**
 * Botão «Contactar pelo WhatsApp». Só é apresentado com autorização explícita do mentor.
 * Abre https://wa.me/NUMERO?text=MENSAGEM (número internacional só com dígitos, mensagem codificada).
 */
export function WhatsAppButton({ number, serviceTitle, authorized, variant = 'outline', label = 'Contactar pelo WhatsApp', className = '', icon = false }: Props) {
  if (!authorized) return null
  const cls = `btn ${variant === 'primary' ? 'btn-primary' : ''} ${className}`
  const content = (
    <>
      {icon && <MessageCircle size={18} aria-hidden />}
      {label}
    </>
  )
  const url = number ? buildWhatsAppUrl(number, serviceTitle) : null
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={cls}>
        {content}
      </a>
    )
  }
  return (
    <button
      type="button"
      className={cls}
      onClick={() => toast.info('Este perfil de demonstração não tem número público. Num perfil real, abre o WhatsApp com a mensagem preenchida.')}
    >
      {content}
    </button>
  )
}
