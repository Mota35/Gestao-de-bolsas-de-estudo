const raw = import.meta.env

export const env = {
  apiUrl: ((raw.VITE_API_URL as string | undefined) || '/api/v1').replace(/\/$/, ''),
  demoMode: (raw.VITE_DEMO_MODE as string | undefined) === 'true',
  demoReferenceDate: (raw.VITE_DEMO_REFERENCE_DATE as string | undefined) || '2026-10-26',
  supportEmail: (raw.VITE_SUPPORT_EMAIL as string | undefined) || 'suporte@kwanza.example',
}

/** Data de referência: fixa em demonstração, hoje em produção. */
export function referenceDate(): Date {
  if (env.demoMode) return new Date(`${env.demoReferenceDate}T12:00:00`)
  return new Date()
}
