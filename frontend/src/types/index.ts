export type Role = 'student' | 'mentor' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  phone?: string | null
}

export type VerificationStatus = 'verified' | 'pending' | 'rejected'
export type ScholarshipStatus = 'open' | 'closed' | 'expired'
export type FundingType = 'full' | 'partial' | 'other'
export type Modality = 'presential' | 'online' | 'hybrid'
export type EducationLevel = 'bachelor' | 'master' | 'phd' | 'technical' | 'other'

export interface Scholarship {
  id: string
  title: string
  institution: string
  country: string
  level: EducationLevel
  field: string
  funding: FundingType
  modality: Modality
  deadline: string | null
  publishedAt: string
  status: ScholarshipStatus
  verification: VerificationStatus
  sourceName: string
  sourceUrl: string | null
  description: string
  requirements?: string[]
  applicationUrl?: string | null
  isDemo?: boolean
  active?: boolean
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface ScholarshipFilters {
  q?: string
  country?: string
  level?: EducationLevel | ''
  field?: string
  funding?: FundingType | ''
  modality?: Modality | ''
  status?: ScholarshipStatus | ''
  deadlineBefore?: string
  sort?: 'deadline' | 'published' | 'relevance'
  page?: number
}

export interface Mentor {
  id: string
  name: string
  photoUrl?: string | null
  headline: string
  bio: string
  specialties: string[]
  experience: string
  qualifications: string[]
  languages: string[]
  verification: VerificationStatus
  whatsappPublic: boolean
  /** Presente apenas se o mentor autorizou a divulgação. */
  whatsapp?: string | null
  isDemo?: boolean
}

export type ServiceMode = 'online' | 'presential'

export interface MentorService {
  id: string
  mentorId: string
  mentorName?: string
  title: string
  description: string
  kind: 'course' | 'mentoring'
  price: number
  currency: 'AOA' | 'USD' | 'EUR'
  mode: ServiceMode
  availability: string
  published: boolean
  reported?: boolean
  isDemo?: boolean
}

export interface StudentProfile {
  nationality: string
  educationLevel: EducationLevel | ''
  fieldOfStudy: string
  targetCountry: string
  phone?: string
  notifyDeadlines: boolean
}

export interface MentorProfileInput {
  headline: string
  bio: string
  specialties: string[]
  experience: string
  qualifications: string[]
  languages: string[]
  whatsapp: string
  whatsappPublic: boolean
  photoUrl?: string
}

export interface Application {
  id: string
  scholarshipId: string
  scholarshipTitle: string
  status: 'draft' | 'submitted' | 'accepted' | 'rejected'
  updatedAt: string
}

export interface AdminUser extends User {
  active: boolean
  createdAt: string
}

export interface UsageReport {
  users: number
  mentors: number
  scholarships: number
  favorites: number
  period: string
}

export interface IntegrationStatus {
  id: string
  name: string
  status: 'ok' | 'error' | 'disabled'
  lastRunAt: string | null
  message?: string
}

export interface AuditEntry {
  id: string
  actor: string
  action: string
  target: string
  at: string
}

export interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
  error?: { code?: string; message?: string; details?: unknown; requestId?: string }
}
