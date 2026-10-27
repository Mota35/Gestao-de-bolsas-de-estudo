import { referenceDate } from './env'
import type { CallStatus, Funding, Level, Modality } from '../types'

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const MONTHS_SHORT = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']

function parts(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return { y, m, d }
}

/** "30 de novembro de 2026" */
export function formatDate(iso: string): string {
  const { y, m, d } = parts(iso)
  return `${d} de ${MONTHS[m - 1]} de ${y}`
}

/** "26 out. 2026" */
export function formatDateShort(iso: string): string {
  const { y, m, d } = parts(iso)
  return `${d} ${MONTHS_SHORT[m - 1].replace('.', '')}. ${y}`
}

export function formatToday(): string {
  const r = referenceDate()
  return `${r.getDate()} de ${MONTHS[r.getMonth()]} de ${r.getFullYear()}`
}

/** "12 500 Kz" */
export function formatKz(value: number): string {
  return `${Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} Kz`.replace(/ /g, ' ')
}

/** Uma bolsa com prazo anterior à data de referência nunca é apresentada como aberta. */
export function callStatus(deadlineIso: string): CallStatus {
  const ref = referenceDate()
  const refIso = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${String(ref.getDate()).padStart(2, '0')}`
  return deadlineIso.slice(0, 10) < refIso ? 'expirada' : 'aberta'
}

export const levelLabel: Record<Level, string> = {
  licenciatura: 'Licenciatura',
  mestrado: 'Mestrado',
  doutoramento: 'Doutoramento',
  tecnico: 'Cursos técnicos',
  outros: 'Outros',
}
export const fundingLabel: Record<Funding, string> = {
  integral: 'Integral',
  parcial: 'Parcial',
  outro: 'Outro apoio',
}
export const modalityLabel: Record<Modality, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrida: 'Híbrida',
}

/** Remove tudo o que não é dígito. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Número internacional apenas com dígitos (sem +, espaços ou traços).
 * Números locais angolanos de 9 dígitos recebem o indicativo 244.
 */
export function normalizeWhatsAppNumber(raw: string): string | null {
  let d = digitsOnly(raw)
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 9) d = `244${d}`
  return d.length >= 11 && d.length <= 15 ? d : null
}

/** https://wa.me/NUMERO?text=MENSAGEM — mensagem codificada para URL. */
export function buildWhatsAppUrl(rawNumber: string, serviceTitle: string): string | null {
  const number = normalizeWhatsAppNumber(rawNumber)
  if (!number) return null
  const message = `Olá, gostaria de informações sobre ${serviceTitle}.`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
