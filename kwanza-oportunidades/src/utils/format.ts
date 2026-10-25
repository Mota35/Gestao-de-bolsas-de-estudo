import type {
  EducationLevel,
  FundingType,
  Modality,
  Scholarship,
  ScholarshipStatus,
  VerificationStatus,
} from '../types'

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Sem prazo definido'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Data inválida'
  return new Intl.DateTimeFormat('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

export function formatPrice(price: number, currency: string): string {
  if (price === 0) return 'Gratuito'
  try {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency }).format(price)
  } catch {
    return `${price} ${currency}`
  }
}

export const levelLabels: Record<EducationLevel, string> = {
  bachelor: 'Licenciatura',
  master: 'Mestrado',
  phd: 'Doutoramento',
  technical: 'Curso técnico',
  other: 'Outro',
}
export const fundingLabels: Record<FundingType, string> = {
  full: 'Financiamento integral',
  partial: 'Financiamento parcial',
  other: 'Outro financiamento',
}
export const modalityLabels: Record<Modality, string> = {
  presential: 'Presencial',
  online: 'Online',
  hybrid: 'Híbrida',
}
export const statusLabels: Record<ScholarshipStatus, string> = {
  open: 'Candidaturas abertas',
  closed: 'Candidaturas fechadas',
  expired: 'Expirada',
}
export const verificationLabels: Record<VerificationStatus, string> = {
  verified: 'Verificada',
  pending: 'Pendente de verificação',
  rejected: 'Rejeitada',
}

/**
 * Nunca apresenta uma bolsa expirada como aberta: se o prazo já passou,
 * o estado efectivo é "expired", independentemente do que o servidor enviou.
 */
export function effectiveStatus(s: Pick<Scholarship, 'status' | 'deadline'>): ScholarshipStatus {
  if (s.status === 'expired') return 'expired'
  if (s.deadline) {
    const end = new Date(s.deadline)
    end.setHours(23, 59, 59, 999)
    if (end.getTime() < Date.now()) return 'expired'
  }
  return s.status
}

export function splitList(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}
