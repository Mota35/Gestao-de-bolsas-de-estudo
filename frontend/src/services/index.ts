import { http } from './http'
import type { Mentor, MentorQuery, MentorService, Paginated, Preferences, Scholarship, ScholarshipQuery, ServiceQuery, SessionUser, StudentProfile } from '../types'
import type {
  AdminAuditEntry,
  AdminIntegration,
  AdminIntegrationLog,
  AdminMentorReview,
  AdminOverview,
  AdminReport,
  AdminScholarshipRow,
  AdminUser,
  MentorOverview,
  MentorOwnProfile,
  MentorServiceDraft,
} from '../types/area'

const clean = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && !v.length)))

export const authService = {
  me: () => http.get<Omit<SessionUser, 'initials'> & { role: string }>('/users/me').then((r) => ({ ...r.data, role: r.data.role.toLowerCase() as SessionUser['role'], initials: r.data.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() })),
  login: (data: { email: string; password: string }) => http.post<{ user: Omit<SessionUser, 'initials'> & { role: string } }>('/auth/login', data).then((r) => { const u = r.data.user; return { ...u, role: u.role.toLowerCase() as SessionUser['role'], initials: u.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() } }),
  register: (data: { name: string; email: string; password: string; role: 'estudante' | 'mentor'; newsletter: boolean }) => http.post(`/auth/register/${data.role === 'estudante' ? 'student' : 'mentor'}`, { name: data.name, email: data.email, password: data.password }).then((r) => r.data),
  logout: () => http.post('/auth/logout').then(() => undefined),
  forgotPassword: (email: string) => http.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (data: { token: string; password: string }) => http.post('/auth/reset-password', { token: data.token, newPassword: data.password }).then((r) => r.data),
}

export const scholarshipService = {
  list: (q: ScholarshipQuery) => http.get<Paginated<Scholarship>>('/scholarships', { params: clean(q) }).then((r) => r.data),
  get: (slug: string) => http.get<Scholarship>(`/scholarships/${slug}`).then((r) => r.data),
}

export const favoriteService = {
  list: () => http.get<Scholarship[]>('/me/favorites').then((r) => r.data),
  add: (slug: string) => http.put(`/me/favorites/${slug}`).then(() => undefined),
  remove: (slug: string) => http.delete(`/me/favorites/${slug}`).then(() => undefined),
  clear: () => http.delete('/me/favorites').then(() => undefined),
}

export const mentorService = {
  list: (q: MentorQuery) => http.get<Mentor[]>('/mentors', { params: clean(q) }).then((r) => r.data),
  get: (slug: string) => http.get<Mentor>(`/mentors/${slug}`).then((r) => r.data),
}

export const courseService = {
  list: (q: ServiceQuery) => http.get<MentorService[]>('/services', { params: clean(q) }).then((r) => r.data),
  report: (data: { target: string; reason: string }) => http.post('/reports', data).then((r) => r.data),
}

export const supportService = {
  send: (data: { name: string; email: string; category: string; subject: string; message: string; consent: boolean }) => http.post('/support', data).then((r) => r.data),
}

export const studentService = {
  profile: () => http.get<StudentProfile>('/me/profile').then((r) => r.data),
  saveProfile: (data: Partial<StudentProfile>) => http.put<StudentProfile>('/me/profile', data).then((r) => r.data),
  recommendations: () => http.get<Scholarship[]>('/me/recommendations').then((r) => r.data),
  preferences: () => http.get<Preferences>('/me/preferences').then((r) => r.data),
  savePreferences: (data: Partial<Preferences>) => http.put<Preferences>('/me/preferences', data).then((r) => r.data),
  requestData: (kind: 'copia' | 'eliminacao') => http.post('/me/data-requests', { kind }).then((r) => r.data),
}

export const mentorAreaService = {
  overview: () => http.get<MentorOverview>('/mentor/overview').then((r) => r.data),
  profile: () => http.get<MentorOwnProfile>('/mentor/profile').then((r) => r.data),
  saveProfile: (data: Partial<MentorOwnProfile>) => http.put<MentorOwnProfile>('/mentor/profile', data).then((r) => r.data),
  service: (id: string) => http.get<MentorServiceDraft>(`/mentor/services/${id}`).then((r) => r.data),
  createService: (data: MentorServiceDraft) => http.post<MentorServiceDraft>('/mentor/services', data).then((r) => r.data),
  saveService: (id: string, data: Partial<MentorServiceDraft>) => http.put<MentorServiceDraft>(`/mentor/services/${id}`, data).then((r) => r.data),
  uploadPhoto: (file: File) => {
    const body = new FormData()
    body.append('photo', file)
    return http.post<{ photo: string }>('/mentor/profile/photo', body).then((r) => r.data)
  },
  requestReview: () => http.post('/mentor/profile/review').then((r) => r.data),
  saveAvailability: (data: { period: string; schedule: string[] }) => http.put('/mentor/availability', data).then((r) => r.data),
  setState: (id: string, state: MentorServiceDraft['state']) => http.post(`/mentor/services/${id}/state`, { state }).then((r) => r.data),
}

export const adminService = {
  overview: () => http.get<AdminOverview>('/admin/overview').then((r) => r.data),
  users: () => http.get<AdminUser[]>('/admin/users').then((r) => r.data),
  changeRole: (id: string, data: { role: string; state: string; reason: string }) => http.put(`/admin/users/${id}/role`, data).then((r) => r.data),
  mentorReviews: () => http.get<AdminMentorReview[]>('/admin/mentor-reviews').then((r) => r.data),
  decideMentor: (id: string, data: { decision: string; reason: string }) => http.post(`/admin/mentor-reviews/${id}/decision`, data).then((r) => r.data),
  scholarships: () => http.get<AdminScholarshipRow[]>('/admin/scholarships').then((r) => r.data),
  createScholarship: (data: Record<string, unknown>) => http.post('/admin/scholarships', data).then((r) => r.data),
  saveScholarship: (id: string, data: Record<string, unknown>) => http.put(`/admin/scholarships/${id}`, data).then((r) => r.data),
  verifyScholarship: (id: string) => http.post(`/admin/scholarships/${id}/verify`).then((r) => r.data),
  deactivateScholarship: (id: string) => http.post(`/admin/scholarships/${id}/deactivate`).then((r) => r.data),
  reports: () => http.get<AdminReport[]>('/admin/reports').then((r) => r.data),
  decideReport: (id: string, data: Record<string, unknown>) => http.post(`/admin/reports/${id}/decision`, data).then((r) => r.data),
  integrations: () => http.get<AdminIntegration[]>('/admin/integrations').then((r) => r.data),
  integrationLogs: () => http.get<AdminIntegrationLog[]>('/admin/integration-logs').then((r) => r.data),
  audit: () => http.get<AdminAuditEntry[]>('/admin/audit').then((r) => r.data),
}
