import type { PublishState } from './index'

export interface MentorOwnProfile {
  name: string
  title: string
  bio: string
  specialties: string
  experience: string
  languages: string
  modalities: string
  place: string
  whatsapp: string
  whatsappConsent: boolean
  confirmTruth: boolean
  verification: 'pendente' | 'verificado' | 'rejeitado'
  photo?: string
  location: string
}

export interface MentorServiceDraft {
  id?: string
  title: string
  description: string
  specialty: string
  kind: 'mentoria' | 'curso'
  price: number
  currency: 'AOA'
  duration: string
  modality: 'online' | 'presencial'
  place: string
  availability: string
  conditions: string
  state: PublishState
  showWhatsApp: boolean
}

export interface MentorOverview {
  published: number
  drafts: number
  disabled: number
  services: MentorServiceDraft[]
  availabilityPeriod: string
  schedule: string[]
}

export interface AdminOverview {
  users: { total: number; students: number; mentors: number }
  scholarships: { total: number; open: number; expired: number }
  pendingMentors: number
  pendingReports: number
  weekly: Array<{ label: string; value: number }>
  content: Array<{ label: string; value: number }>
  pending: Array<{ type: string; resource: string; date: string; state: string; next: string }>
}

export interface AdminUser {
  id: string
  name: string
  role: string
  state: string
  createdAt: string
  action: string
}
export interface AdminMentorReview {
  id: string
  name: string
  specialty: string
  requestedAt: string
  state: string
  action: string
}
export interface AdminReport {
  id: string
  resource: string
  type: string
  receivedAt: string
  state: string
  action: string
}
export interface AdminIntegration {
  id: string
  origin: string
  type: string
  lastSync: string[]
  state: string
  action: string
}
export interface AdminAuditEntry {
  id: string
  when: string
  action: string
  user: string[]
  resource: string
  result: string
}
export interface AdminIntegrationLog {
  when: string
  origin: string
  event: string
  result: string
}

export interface AdminScholarshipRow {
  id: string
  slug: string
  title: string
  deadline: string
  verification: 'verificada' | 'pendente'
  active: boolean
}
