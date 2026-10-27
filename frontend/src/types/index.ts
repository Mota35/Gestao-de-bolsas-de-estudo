export type Level = 'licenciatura' | 'mestrado' | 'doutoramento' | 'tecnico' | 'outros'
export type Funding = 'integral' | 'parcial' | 'outro'
export type Modality = 'presencial' | 'online' | 'hibrida'
export type Verification = 'verificada' | 'pendente'
export type CallStatus = 'aberta' | 'expirada'
export type SortKey = 'prazo' | 'publicacao' | 'relevancia'

export interface Scholarship {
  id: string
  slug: string
  title: string
  institution: string
  country: string
  level: Level
  area: string
  funding: Funding
  modality: Modality
  /** ISO AAAA-MM-DD */
  deadline: string
  publishedAt: string
  updatedAt: string
  verification: Verification
  isDemo: boolean
  /** Ligação oficial validada pelo backend. Nunca é inventada no frontend. */
  officialUrl?: string
  sourceName?: string
  summary?: string
  eligibility?: string[]
  benefits?: string[]
  documents?: string[]
}

export interface ScholarshipQuery {
  q?: string
  pais?: string
  nivel?: Level[]
  area?: string
  financiamento?: Funding | ''
  modalidade?: Modality | ''
  estado?: CallStatus | ''
  prazoAte?: string
  verificacao?: Verification | ''
  sort?: SortKey
  page?: number
  pageSize?: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type ServiceKind = 'mentoria' | 'curso'
export type PublishState = 'rascunho' | 'publicado' | 'desactivado'

export interface MentorService {
  id: string
  mentorSlug: string
  mentorName: string
  mentorVerified: boolean
  title: string
  kind: ServiceKind
  modality: 'online' | 'presencial'
  location?: string
  duration: string
  availability: string
  price: number
  currency: 'AOA'
  whatsappAllowed: boolean
  /** Só presente quando o mentor autorizou a divulgação. */
  whatsapp?: string
  state: PublishState
  specialty?: string
}

export interface Mentor {
  slug: string
  name: string
  headline: string
  specialty: string
  verified: boolean
  location: string
  languages: string[]
  modalities: string[]
  availability: string
  availabilityNote?: string
  priceFrom: number
  tags: string[]
  bio: string[]
  qualifications: string[]
  photo?: string
  whatsappAllowed: boolean
  whatsapp?: string
  isDemo: boolean
  schedule: string[]
  services: MentorService[]
}

export interface MentorQuery {
  q?: string
  especialidade?: string
  idioma?: string
  modalidade?: string
  precoMax?: number
  disponibilidade?: string
  apenasVerificados?: boolean
}

export interface ServiceQuery {
  q?: string
  tipo?: ServiceKind | ''
  modalidade?: string
  especialidade?: string
  preco?: string
  disponibilidade?: string
  verificacao?: string
}

export type Role = 'estudante' | 'mentor' | 'admin'

export interface SessionUser {
  id: string
  name: string
  role: Role
  email: string
  initials: string
}

export interface StudentProfile {
  displayName: string
  nationality: string
  academicLevel: string
  area: string
  targetLevel: string
  targetCountry: string
  email: string
}

export interface Preferences {
  language: 'pt' | 'en'
  notifyOpportunities: boolean
  notifyDeadlines: boolean
  notifyCourses: boolean
  notifyOptional: boolean
  allowSuggestions: boolean
}

export interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
}
