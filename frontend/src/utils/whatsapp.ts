/**
 * Normaliza um número para o formato internacional exigido pelo wa.me:
 * apenas dígitos, sem +, espaços ou traços. Números angolanos locais
 * (9 dígitos, começados por 9) recebem o indicativo 244.
 */
export function normalizeWhatsappNumber(raw: string): string | null {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 9 && digits.startsWith('9')) digits = `244${digits}`
  if (digits.length < 11 || digits.length > 15) return null
  return digits
}

export function buildWhatsappLink(rawNumber: string, serviceName: string): string | null {
  const number = normalizeWhatsappNumber(rawNumber)
  if (!number) return null
  const message = `Olá! Vi o serviço "${serviceName}" na plataforma Kwanza Oportunidades e gostaria de receber mais informações.`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
