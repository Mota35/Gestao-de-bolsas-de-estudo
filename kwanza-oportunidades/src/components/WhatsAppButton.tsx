import { MessageCircle } from 'lucide-react'
import { buildWhatsappLink } from '../utils/whatsapp'

interface Props {
  number?: string | null
  /** Só mostra o botão se o mentor autorizou a divulgação. */
  authorized: boolean
  serviceName: string
}

export function WhatsAppButton({ number, authorized, serviceName }: Props) {
  if (!authorized || !number) {
    return <p className="text-sm text-slate-500">Este mentor não divulgou um contacto de WhatsApp.</p>
  }
  const href = buildWhatsappLink(number, serviceName)
  if (!href) {
    return <p className="text-sm text-slate-500">O contacto de WhatsApp deste mentor não é válido.</p>
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn-accent">
      <MessageCircle className="h-4 w-4" aria-hidden />
      Contactar pelo WhatsApp
    </a>
  )
}
