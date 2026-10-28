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

const levelFromApi: Record<string, Scholarship['level']> = { BACHELOR: 'licenciatura', MASTER: 'mestrado', DOCTORATE: 'doutoramento', VOCATIONAL: 'tecnico', OTHER: 'outros', SHORT_COURSE: 'outros', POSTDOC: 'doutoramento' }
const levelToApi: Record<string, string> = { licenciatura: 'BACHELOR', mestrado: 'MASTER', doutoramento: 'DOCTORATE', tecnico: 'VOCATIONAL', outros: 'OTHER' }
const fundingFromApi: Record<string, Scholarship['funding']> = { FULL: 'integral', PARTIAL: 'parcial', TUITION_ONLY: 'parcial', STIPEND: 'parcial', OTHER: 'outro' }
const modeFromApi = (v?: string | null): Scholarship['modality'] => v === 'ONLINE' ? 'online' : v === 'HYBRID' ? 'hibrida' : 'presencial'
const specialtyToApi: Record<string, string> = { 'Bolsas e candidaturas': 'APPLICATION_SUPPORT', 'Carreira e tecnologia': 'CAREER_GUIDANCE', 'Investigação e escrita académica': 'ACADEMIC_MENTORSHIP', 'Cursos técnicos e empregabilidade': 'PREPARATION' }
const specialtyFromApi: Record<string, string> = Object.fromEntries(Object.entries(specialtyToApi).map(([k, v]) => [v, k]))
const scholarshipFromApi = (s: any): Scholarship => ({
  id: s.id, slug: s.slug, title: s.title, institution: s.sponsoringInstitution ?? s.institution, country: s.destinationCountry ?? s.country,
  level: levelFromApi[s.educationLevel?.[0] ?? s.level] ?? s.level ?? 'outros', area: s.studyAreas?.[0] ?? s.area ?? '', funding: fundingFromApi[s.fundingType ?? s.funding] ?? s.funding ?? 'outro',
  modality: modeFromApi(s.studyMode ?? s.modality), deadline: s.applicationDeadline ?? s.deadline ?? '', publishedAt: s.createdAt ?? s.publishedAt, updatedAt: s.updatedAt ?? s.createdAt,
  verification: (s.verification?.status ?? s.verificationStatus) === 'VERIFIED' || s.verification === 'verificada' ? 'verificada' : 'pendente', isDemo: false, officialUrl: s.officialUrl,
  sourceName: s.source?.name, summary: s.description, eligibility: s.eligibilityCriteria ? [s.eligibilityCriteria] : s.eligibility ?? [], documents: s.requiredDocuments ?? s.documents ?? [],
})
const scholarshipQuery = (q: ScholarshipQuery) => clean({
  q: q.q, country: q.pais, level: q.nivel?.map((x) => levelToApi[x]).join(','), area: q.area, funding: q.financiamento === 'integral' ? 'FULL' : q.financiamento === 'parcial' ? 'PARTIAL' : q.financiamento ? 'OTHER' : undefined,
  mode: q.modalidade === 'online' ? 'ONLINE' : q.modalidade === 'hibrida' ? 'HYBRID' : q.modalidade === 'presencial' ? 'IN_PERSON' : undefined,
  state: q.estado === 'aberta' ? 'open' : q.estado === 'expirada' ? 'closed' : undefined, deadlineBefore: q.prazoAte,
  sort: q.sort === 'publicacao' ? 'recent' : q.sort === 'relevancia' ? 'title' : 'deadline_asc', page: q.page, pageSize: q.pageSize,
})
const mentorServiceFromApi = (s: any, mentor?: any, kind: 'mentoria' | 'curso' = 'mentoria'): MentorService => ({
  id: s.id, mentorSlug: mentor?.id ?? s.mentor?.id ?? '', mentorName: mentor?.name ?? s.mentor?.name ?? '', mentorVerified: mentor?.verified ?? s.mentor?.verified ?? false,
  title: s.title, kind, modality: s.mode === 'ONLINE' ? 'online' : 'presencial', location: s.place ?? mentor?.location,
  duration: s.durationMinutes ? `${s.durationMinutes} min` : '', availability: s.availability ?? mentor?.availability ?? '', price: Number(s.price), currency: 'AOA',
  whatsappAllowed: Boolean((s.showWhatsApp ?? true) && s.mentor?.whatsapp), whatsapp: s.mentor?.whatsapp?.waDigits,
  state: s.publicationStatus === 'PUBLISHED' ? 'publicado' : s.publicationStatus === 'UNPUBLISHED' || s.publicationStatus === 'ARCHIVED' ? 'desactivado' : 'rascunho', specialty: specialtyFromApi[s.category] ?? s.category,
})

const roleFromApi = (role: string): SessionUser['role'] => {
  const normalized = role.toUpperCase()
  if (normalized === 'ADMIN') return 'admin'
  if (normalized === 'MENTOR') return 'mentor'
  return 'estudante'
}

export const authService = {
  me: () => http.get<Omit<SessionUser, 'initials'> & { role: string }>('/users/me').then((r) => ({ ...r.data, role: roleFromApi(r.data.role), initials: r.data.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() })),
  login: (data: { email: string; password: string }) => http.post<{ user: Omit<SessionUser, 'initials'> & { role: string } }>('/auth/login', data).then((r) => { const u = r.data.user; return { ...u, role: roleFromApi(u.role), initials: u.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() } }),
  register: (data: { name: string; email: string; password: string; role: 'estudante' | 'mentor'; newsletter: boolean }) => http.post(`/auth/register/${data.role === 'estudante' ? 'student' : 'mentor'}`, { name: data.name, email: data.email, password: data.password, termsAccepted: true, newsletterConsent: data.newsletter }).then((r) => r.data),
  logout: () => http.post('/auth/logout').then(() => undefined),
  forgotPassword: (email: string) => http.post('/auth/forgot-password', { email }).then((r) => r.data),
  resetPassword: (data: { token: string; password: string }) => http.post('/auth/reset-password', { token: data.token, newPassword: data.password }).then((r) => r.data),
}

export const scholarshipService = {
  list: (q: ScholarshipQuery): Promise<Paginated<Scholarship>> => http.get<any>('/scholarships', { params: scholarshipQuery(q) }).then((r) => ({ ...r.data, items: r.data.items.map(scholarshipFromApi) })),
  get: (slug: string): Promise<Scholarship> => http.get<any>(`/scholarships/${slug}`).then((r) => scholarshipFromApi(r.data)),
}

export const favoriteService = {
  list: (): Promise<Scholarship[]> => http.get<any>('/me/favorites', { params: { page: 1, pageSize: 100 } }).then((r) => r.data.items.map((x: any) => scholarshipFromApi(x.scholarship))),
  add: async (slug: string) => { const s = await scholarshipService.get(slug); await http.put(`/me/favorites/${s.id}`) },
  remove: async (slug: string) => { const s = await scholarshipService.get(slug); await http.delete(`/me/favorites/${s.id}`) },
  clear: async () => { const favs = await http.get<any>('/me/favorites', { params: { page: 1, pageSize: 100 } }); await Promise.all(favs.data.items.map((x: any) => http.delete(`/me/favorites/${x.scholarship.id}`))) },
}

export const mentorService = {
  list: (q: MentorQuery): Promise<Mentor[]> => http.get<any>('/mentors', { params: clean({ q: q.q, specialty: q.especialidade, language: q.idioma, modality: q.modalidade === 'Online' ? 'ONLINE' : q.modalidade === 'Presencial' ? 'IN_PERSON' : undefined, maxPrice: q.precoMax, availability: q.disponibilidade, pageSize: 100 }) }).then((r) => r.data.items.map((m: any) => mentorFromApi(m))),
  get: (slug: string): Promise<Mentor> => http.get<any>(`/mentors/${slug}`).then((r) => mentorFromApi(r.data)),
}

function mentorFromApi(m: any): Mentor {
  const services = [...(m.services ?? []).map((s: any) => mentorServiceFromApi(s, { ...m, id: m.id }, 'mentoria')), ...(m.courses ?? []).map((s: any) => mentorServiceFromApi(s, { ...m, id: m.id }, 'curso'))]
  return { slug: m.id, name: m.name, headline: m.headline ?? m.specialties?.[0] ?? 'Mentor', specialty: m.specialties?.[0] ?? '', verified: Boolean(m.verified),
    location: m.location ?? '', languages: m.languages ?? [], modalities: m.modalities ?? [], availability: m.availability ?? '', availabilityNote: m.availabilityNote,
    priceFrom: services.length ? Math.min(...services.map((s) => s.price)) : m.priceFrom ?? 0, tags: m.specialties ?? [], bio: Array.isArray(m.bio) ? m.bio : m.bio ? [m.bio] : [], qualifications: m.qualifications ?? [], photo: m.photo,
    whatsappAllowed: Boolean(m.whatsapp), whatsapp: m.whatsapp?.waDigits, isDemo: false, schedule: m.schedule ?? [], services }
}

export const courseService = {
  list: async (q: ServiceQuery): Promise<MentorService[]> => {
    const base = { q: q.q, mode: q.modalidade === 'online' ? 'ONLINE' : q.modalidade === 'presencial' ? 'IN_PERSON' : undefined, pageSize: 100 }
    const servicesParams = clean({ ...base, category: specialtyToApi[q.especialidade ?? ''] })
    const coursesParams = clean({ ...base, category: q.especialidade })
    const [services, courses] = await Promise.all([http.get<any>('/mentor-services', { params: servicesParams }), http.get<any>('/courses', { params: coursesParams })])
    let rows: MentorService[] = [...services.data.items.map((s: any) => mentorServiceFromApi(s, s.mentor, 'mentoria')), ...courses.data.items.map((s: any) => mentorServiceFromApi(s, s.mentor, 'curso'))]
    if (q.tipo) rows = rows.filter((s) => s.kind === q.tipo)
    if (q.especialidade) rows = rows.filter((s) => s.specialty === q.especialidade)
    if (q.preco === 'ate-10000') rows = rows.filter((s) => s.price <= 10000)
    if (q.preco === 'ate-20000') rows = rows.filter((s) => s.price <= 20000)
    if (q.preco === 'mais-20000') rows = rows.filter((s) => s.price > 20000)
    if (q.disponibilidade) rows = rows.filter((s) => s.availability.toLowerCase().includes(q.disponibilidade!.toLowerCase()))
    if (q.verificacao === 'nao-verificados') rows = []
    return rows
  },
  report: (data: { target: string; reason: string }) => {
    const [kind, targetId] = data.target.split(':')
    return http.post('/reports', { targetType: kind === 'service' ? 'MENTOR_SERVICE' : kind === 'course' ? 'COURSE' : 'MENTOR_PROFILE', targetId, reason: 'OTHER', details: data.reason }).then((r) => r.data)
  },
}

export const supportService = {
  send: (data: { name: string; email: string; category: string; subject: string; message: string; consent: boolean }) => http.post('/support', data).then((r) => r.data),
}

export const studentService = {
  profile: () => http.get<any>('/users/me').then((r) => studentFromApi(r.data)),
  saveProfile: async (data: Partial<StudentProfile>) => {
    const current = await http.get<any>('/users/me')
    const prefs = (current.data.studentProfile?.academicPreferences ?? {}) as Record<string, unknown>
    const input = { ...(data.displayName ? { name: data.displayName } : {}), studentProfile: {
      nationalityCountry: data.nationality, academicLevel: data.academicLevel, fieldOfStudy: data.area,
      destinationCountries: data.targetCountry ? [data.targetCountry] : [],
      academicPreferences: { ...prefs, ...(data.targetLevel ? { targetLevel: data.targetLevel } : {}) },
    } }
    const saved = await http.patch<any>('/users/me', input)
    return studentFromApi(saved.data)
  },
  recommendations: () => http.get<any[]>('/users/me/recommendations').then((r) => r.data.map(scholarshipFromApi)),
  preferences: () => http.get<Preferences>('/users/me/preferences').then((r) => r.data),
  savePreferences: (data: Partial<Preferences>) => http.put<Preferences>('/users/me/preferences', data).then((r) => r.data),
  requestData: (kind: 'copia' | 'eliminacao') => http.post('/users/me/data-requests', { kind }).then((r) => r.data),
}

function studentFromApi(u: any): StudentProfile {
  const p = u.studentProfile ?? {}
  const prefs = p.academicPreferences ?? {}
  return { displayName: u.name, email: u.email, nationality: p.nationalityCountry ?? '', academicLevel: p.academicLevel ?? '', area: p.fieldOfStudy ?? '', targetLevel: prefs.targetLevel ?? '', targetCountry: p.destinationCountries?.[0] ?? '' }
}

export const mentorAreaService = {
  overview: async (): Promise<MentorOverview> => {
    const [profile, serviceRows, courseRows] = await Promise.all([http.get<any>('/mentors/me'), http.get<any>('/mentor-services/mine', { params: { pageSize: 100 } }), http.get<any>('/courses/mine', { params: { pageSize: 100 } })])
    const services = [...serviceRows.data.items.map((s: any) => draftFromApi(s, 'mentoria')), ...courseRows.data.items.map((s: any) => draftFromApi(s, 'curso'))]
    return { published: services.filter((s) => s.state === 'publicado').length, drafts: services.filter((s) => s.state === 'rascunho').length, disabled: services.filter((s) => s.state === 'desactivado').length, services, availabilityPeriod: profile.data.availabilityPeriod ?? '', schedule: profile.data.schedule ?? [] }
  },
  profile: (): Promise<MentorOwnProfile> => http.get<any>('/mentors/me').then((r) => mentorOwnFromApi(r.data)),
  saveProfile: async (data: Partial<MentorOwnProfile>): Promise<MentorOwnProfile> => {
    const input: Record<string, unknown> = {}
    if (data.name !== undefined) input.name = data.name
    if (data.title !== undefined) input.headline = data.title
    if (data.bio !== undefined) input.bio = data.bio
    if (data.experience !== undefined) input.experience = data.experience
    if (data.location !== undefined || data.place !== undefined) input.location = data.place ?? data.location
    if (data.modalities !== undefined) input.modalities = data.modalities.split('·').map((s) => s.trim()).filter(Boolean)
    if (data.specialties !== undefined) input.specialties = data.specialties.split(/[·,;]/).map((s) => s.trim()).filter(Boolean)
    if (data.languages !== undefined) input.languages = data.languages.split('·').map((s) => s.trim()).filter(Boolean)
    if (data.whatsapp !== undefined) input.whatsappNumber = data.whatsapp ? (data.whatsapp.startsWith('+') ? data.whatsapp : `+${data.whatsapp}`) : null
    if (data.whatsappConsent !== undefined) input.allowWhatsappPublic = data.whatsappConsent
    const saved = await http.patch<any>('/mentors/me', input)
    return mentorOwnFromApi(saved.data)
  },
  service: async (id: string): Promise<MentorServiceDraft> => {
    const isCourse = id.startsWith('course:'); const key = isCourse ? id.slice(7) : id
    const r = await http.get<any>(isCourse ? `/courses/mine/${key}` : `/mentor-services/mine/${key}`)
    return draftFromApi(r.data, isCourse ? 'curso' : 'mentoria')
  },
  createService: async (data: MentorServiceDraft): Promise<MentorServiceDraft> => {
    const r = await http.post<any>(data.kind === 'curso' ? '/courses' : '/mentor-services', draftToApi(data))
    if (data.state === 'publicado') await http.post(`/${data.kind === 'curso' ? 'courses' : 'mentor-services'}/${r.data.id}/status`, { to: 'PUBLISHED' })
    return draftFromApi(r.data, data.kind)
  },
  saveService: async (id: string, data: Partial<MentorServiceDraft>): Promise<MentorServiceDraft> => {
    const isCourse = id.startsWith('course:'); const key = isCourse ? id.slice(7) : id
    const kind = isCourse ? 'curso' : data.kind ?? 'mentoria'
    const r = await http.patch<any>(`/${isCourse ? 'courses' : 'mentor-services'}/${key}`, draftToApi(data as MentorServiceDraft))
    const nextState = data.state
    if (nextState) await http.post(`/${isCourse ? 'courses' : 'mentor-services'}/${key}/status`, { to: statusToApi(nextState) })
    return draftFromApi(r.data, kind)
  },
  uploadPhoto: async (file: File) => {
    const photoData = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Não foi possível ler a imagem.')); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file) })
    return http.post<{ photo: string }>('/mentors/me/photo', { photoData }).then((r) => r.data)
  },
  requestReview: () => http.post('/mentors/me/submit').then((r) => r.data),
  saveAvailability: (data: { period: string; schedule: string[] }) => http.put('/mentors/me/availability', data).then((r) => r.data),
  setState: (id: string, state: MentorServiceDraft['state']) => { const isCourse = id.startsWith('course:'); const key = isCourse ? id.slice(7) : id; return http.post(`/${isCourse ? 'courses' : 'mentor-services'}/${key}/status`, { to: statusToApi(state) }).then((r) => r.data) },
}

function mentorOwnFromApi(m: any): MentorOwnProfile {
  return { name: m.name ?? '', title: m.title ?? '', bio: m.bio ?? '', specialties: m.specialties?.join(' · ') ?? '', experience: m.experience ?? '',
    languages: m.languages?.join(' · ') ?? '', modalities: m.modalities?.join(' · ') ?? '', place: m.location ?? '', location: m.location ?? '', whatsapp: m.whatsappNumber ?? '',
    whatsappConsent: Boolean(m.allowWhatsappPublic), confirmTruth: false, verification: m.verificationStatus === 'VERIFIED' ? 'verificado' : m.verificationStatus === 'REJECTED' ? 'rejeitado' : 'pendente', photo: m.photo }
}
function statusToApi(state: MentorServiceDraft['state']) { return state === 'publicado' ? 'PUBLISHED' : state === 'desactivado' ? 'UNPUBLISHED' : 'DRAFT' }
function draftFromApi(s: any, kind: 'mentoria' | 'curso'): MentorServiceDraft {
  return { id: kind === 'curso' ? `course:${s.id}` : s.id, title: s.title, description: s.description, specialty: s.category, kind,
    price: Number(s.price), currency: s.currency ?? 'AOA', duration: s.durationMinutes ? `${s.durationMinutes} min` : '', modality: s.mode === 'ONLINE' ? 'online' : 'presencial',
    place: s.place ?? '', availability: s.availability ?? '', conditions: s.conditions ?? s.requirements ?? '', state: s.publicationStatus === 'PUBLISHED' ? 'publicado' : s.publicationStatus === 'UNPUBLISHED' || s.publicationStatus === 'ARCHIVED' ? 'desactivado' : 'rascunho', showWhatsApp: Boolean(s.showWhatsApp) }
}
function draftToApi(s: MentorServiceDraft) {
  const mins = Number(String(s.duration).match(/\d+/)?.[0] ?? 60)
  const mode = s.modality === 'online' ? 'ONLINE' : 'IN_PERSON'
  const common = { title: s.title, description: s.description, category: s.kind === 'curso' ? s.specialty : specialtyToApi[s.specialty] ?? (['APPLICATION_SUPPORT','CAREER_GUIDANCE','STUDY_ABROAD','LANGUAGE_TEST','PREPARATION','ACADEMIC_MENTORSHIP','OTHER'].includes(s.specialty) ? s.specialty : 'OTHER'), price: Number(s.price), currency: s.currency ?? 'AOA', durationMinutes: mins, mode, availability: s.availability || null, conditions: s.conditions || null, place: s.place || null, showWhatsApp: Boolean(s.showWhatsApp) }
  return s.kind === 'curso' ? { ...common, enrollmentUrl: null } : { ...common, requirements: s.conditions || null }
}

export const adminService = {
  overview: (): Promise<AdminOverview> => http.get<AdminOverview>('/admin/overview').then((r) => r.data),
  users: (): Promise<AdminUser[]> => http.get<any>('/admin/users', { params: { page: 1, pageSize: 100 } }).then((r) => r.data.items.map((u: any) => ({ id: u.id, name: u.name, role: roleLabel(u.role), state: u.isActive ? 'Activa' : 'Suspensa', createdAt: u.createdAt, action: 'Gerir' }))),
  changeRole: (id: string, data: { role: string; state: string; reason: string }) => http.patch(`/admin/users/${id}/role`, { role: roleCode(data.role), isActive: !data.state.toLowerCase().startsWith('susp'), reason: data.reason }).then((r) => r.data),
  mentorReviews: (): Promise<AdminMentorReview[]> => http.get<any>('/admin/mentors', { params: { page: 1, pageSize: 100 } }).then((r) => r.data.items.map((m: any) => ({ id: m.id, name: m.name, specialty: m.specialties?.[0] ?? '—', requestedAt: m.createdAt, state: statusLabel(m.verificationStatus), action: 'Rever pedido' }))),
  decideMentor: (id: string, data: { decision: string; reason: string }) => http.post(`/admin/mentors/${id}/review`, { decision: data.decision.includes('Aprovar') ? 'VERIFIED' : 'REJECTED', reason: data.reason }).then((r) => r.data),
  scholarships: (): Promise<AdminScholarshipRow[]> => http.get<any>('/admin/scholarships', { params: { page: 1, pageSize: 100, state: 'all' } }).then((r) => r.data.items.map((s: any) => ({ id: s.id, slug: s.slug, title: s.title, deadline: s.applicationDeadline?.slice(0, 10) ?? '', verification: s.verification?.status === 'VERIFIED' ? 'verificada' : 'pendente', active: s.publicationStatus !== 'ARCHIVED' }))),
  createScholarship: (data: Record<string, unknown>) => http.post('/admin/scholarships', scholarshipInput(data)).then((r) => r.data),
  saveScholarship: async (id: string, data: Record<string, unknown>) => { const { deadline, sourceChecked, ...rest } = data; const input = { ...rest, ...(deadline ? { applicationDeadline: deadline } : {}) }; if (Object.keys(input).length) await http.patch(`/admin/scholarships/${id}`, input); if (sourceChecked) await http.post(`/admin/scholarships/${id}/mark-checked`); },
  verifyScholarship: (id: string) => http.post(`/admin/scholarships/${id}/verify`, { decision: 'VERIFIED' }).then((r) => r.data),
  deactivateScholarship: (id: string) => http.post(`/admin/scholarships/${id}/transition`, { to: 'ARCHIVED' }).then((r) => r.data),
  reports: (): Promise<AdminReport[]> => http.get<any>('/admin/reports', { params: { page: 1, pageSize: 100 } }).then((r) => r.data.items.map((x: any) => ({ id: x.id, resource: `${x.targetType} · ${x.targetId}`, type: x.reason, receivedAt: x.createdAt, state: x.status === 'OPEN' ? 'Por analisar' : x.status === 'DISMISSED' ? 'Arquivada' : 'Resolvida', action: 'Rever' }))),
  decideReport: async (id: string, data: Record<string, unknown>) => {
    const report = (await http.get<any>(`/admin/reports/${id}`)).data
    const note = String(data.note ?? data.action ?? 'Analisada pela administração')
    if (String(data.action).startsWith('Pedir esclarecimento')) return http.post(`/admin/reports/${id}/request-info`, { note }).then((r) => r.data)
    if (String(data.action).startsWith('Ocultar') && ['MENTOR_SERVICE', 'COURSE'].includes(report.targetType)) {
      await http.post(`/admin/catalog/${report.targetType === 'COURSE' ? 'courses' : 'services'}/${report.targetId}/moderate`, { action: 'UNPUBLISH', reason: note })
    } else if (String(data.action).startsWith('Suspender') && report.targetType === 'MENTOR_PROFILE') {
      await http.post(`/admin/mentors/${report.targetId}/review`, { decision: 'SUSPENDED', reason: note })
    }
    return http.post(`/admin/reports/${id}/resolve`, { outcome: String(data.action).startsWith('Arquivar') ? 'DISMISSED' : 'RESOLVED', note }).then((r) => r.data)
  },
  integrations: (): Promise<AdminIntegration[]> => http.get<any[]>('/admin/sources').then((r) => r.data.map((s: any) => ({ id: s.id, origin: s.name, type: s.collectionMethod, lastSync: s.lastCollectedAt ? [s.lastCollectedAt] : ['Sem sincronização'], state: s.integrationStatus === 'ACTIVE' ? 'Activa' : s.integrationStatus === 'FAILED' ? 'Erro' : 'Pausada', action: 'Consultar' }))),
  integrationLogs: (): Promise<AdminIntegrationLog[]> => http.get<any>('/admin/audit-logs', { params: { page: 1, pageSize: 100, entityType: 'SCHOLARSHIP_SOURCE' } }).then((r) => r.data.items.map((x: any) => ({ when: x.occurredAt, origin: x.entityId ?? 'Fonte', event: x.action, result: JSON.stringify(x.metadata ?? {}) }))),
  audit: (): Promise<AdminAuditEntry[]> => http.get<any>('/admin/audit-logs', { params: { page: 1, pageSize: 100 } }).then((r) => r.data.items.map((x: any) => ({ id: x.id, when: `${x.occurredAt.slice(0, 10)} · ${x.occurredAt.slice(11, 16)}`, action: x.action, user: [x.actor?.name ?? x.actorUserId ?? 'Sistema', x.actor?.email ?? ''], resource: `${x.entityType}${x.entityId ? ` · ${x.entityId}` : ''}`, result: JSON.stringify(x.metadata ?? {}) }))),
}

function roleLabel(role: string) { return role === 'ADMIN' ? 'Administrador' : role === 'MENTOR' ? 'Mentor' : 'Estudante' }
function roleCode(role: string) { return role.toLowerCase().startsWith('admin') ? 'ADMIN' : role.toLowerCase().startsWith('mentor') ? 'MENTOR' : 'STUDENT' }
function statusLabel(status: string) { return status === 'VERIFIED' ? 'Aprovado' : status === 'REJECTED' ? 'Rejeitado' : status === 'SUSPENDED' ? 'Suspenso' : 'Pendente' }
function scholarshipInput(data: Record<string, unknown>) {
  return { ...data, educationLevel: (data.level ? [levelToApi[String(data.level)] ?? 'OTHER'] : ['OTHER']), studyAreas: data.area ? [String(data.area).toLowerCase()] : ['outros'], destinationCountry: data.country ?? 'Angola', sponsoringInstitution: data.institution ?? 'Instituição', description: data.description ?? data.summary ?? 'Descrição por completar antes de publicar.', fundingType: data.funding === 'integral' ? 'FULL' : data.funding === 'parcial' ? 'PARTIAL' : 'OTHER', applicationDeadline: data.deadline ?? null, requiredDocuments: data.documents ?? [], officialUrl: data.officialUrl ?? 'https://example.org', sourceId: data.sourceId }
}
