/**
 * Adaptador de DEMONSTRAÇÃO para o axios (activo apenas com VITE_DEMO_MODE=true).
 * Responde como o backend responderia, com dados fictícios em memória. Não guarda tokens,
 * não envia emails e nunca simula uma recuperação de senha concluída.
 */
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { callStatus } from '../lib/format'
import { demoMentors, demoSavedIds, demoScholarships, demoServices } from '../data/demo'
import { demoAdminOverview, demoAdminUsers, demoAudit, demoIntegrationLogs, demoIntegrations, demoMentorReviews, demoReports } from '../data/demoAdmin'
import type { Mentor, MentorService, Preferences, Role, SessionUser, StudentProfile } from '../types'
import type { AdminScholarshipRow, MentorOwnProfile, MentorServiceDraft } from '../types/area'

const SESSION_KEY = 'kwanza-demo-session' // apenas o id de uma conta fictícia; não é um token

interface Account extends SessionUser {
  password?: never
}

const accounts: Record<string, Account> = {
  'ana@estudante.example': { id: 'u1', name: 'Ana Mavungo', role: 'estudante', email: 'ana@estudante.example', initials: 'AM' },
  'celina@mentor.example': { id: 'u2', name: 'Celina Manuel', role: 'mentor', email: 'celina@mentor.example', initials: 'CM' },
  'lidia@admin.example': { id: 'u6', name: 'Lídia Santos', role: 'admin', email: 'lidia@admin.example', initials: 'LS' },
}

const favorites = new Set<string>(demoSavedIds)

let studentProfile: StudentProfile = {
  displayName: 'Ana Mavungo',
  nationality: 'Angolana',
  academicLevel: 'Ensino secundário concluído',
  area: 'Engenharia',
  targetLevel: 'Licenciatura',
  targetCountry: 'Portugal',
  email: 'ana@estudante.example',
}
let preferences: Preferences = {
  language: 'pt',
  notifyOpportunities: true,
  notifyDeadlines: true,
  notifyCourses: false,
  notifyOptional: false,
  allowSuggestions: true,
}

let mentorProfile: MentorOwnProfile = {
  name: 'Celina Manuel',
  title: 'Orientação de bolsas e candidaturas internacionais',
  bio: 'Acompanho estudantes na leitura de editais, organização de prazos e preparação de candidaturas. Acredito numa orientação próxima e sem promessas de aprovação.',
  specialties: 'Bolsas · Carta de motivação · Engenharia',
  experience: 'Mestrado em Educação — Universidade Nova Aurora (2022). Orientação académica de 2022 a 2026. Dados de demonstração.',
  languages: 'Português · Inglês',
  modalities: 'Online · Presencial',
  place: 'Luanda, Angola',
  whatsapp: '',
  whatsappConsent: false,
  confirmTruth: false,
  verification: 'pendente',
  photo: '/img/mentor-celina.jpg',
  location: 'Luanda',
}

let availability = {
  period: 'Novembro de 2026',
  schedule: ['Terças e quintas · 18h00–20h00', 'Sábados · 09h00–12h00', 'Fuso horário: Angola (UTC+1)'],
}

let ownServices: MentorServiceDraft[] = [
  {
    id: 'own-1',
    title: 'Preparar a candidatura',
    description: 'Uma sessão individual para ler requisitos, organizar os prazos e definir uma lista de tarefas. Não inclui envio de candidatura nem garante admissão.',
    specialty: 'Bolsas e candidaturas',
    kind: 'mentoria',
    price: 12500,
    currency: 'AOA',
    duration: '60 minutos por sessão',
    modality: 'online',
    place: '',
    availability: 'Novembro de 2026 · Terças e quintas, 18h00–20h00',
    conditions: 'Combinar horário e forma de pagamento antes da sessão. Pedir reagendamento com antecedência. Condições ilustrativas.',
    state: 'publicado',
    showWhatsApp: false,
  },
  {
    id: 'own-2',
    title: 'Rever a carta de motivação',
    description: '',
    specialty: 'Bolsas e candidaturas',
    kind: 'mentoria',
    price: 10000,
    currency: 'AOA',
    duration: '45 minutos',
    modality: 'online',
    place: '',
    availability: '',
    conditions: '',
    state: 'rascunho',
    showWhatsApp: false,
  },
  {
    id: 'own-3',
    title: 'Plano académico presencial',
    description: '',
    specialty: 'Bolsas e candidaturas',
    kind: 'mentoria',
    price: 18000,
    currency: 'AOA',
    duration: '90 minutos',
    modality: 'presencial',
    place: 'Luanda',
    availability: '',
    conditions: '',
    state: 'desactivado',
    showWhatsApp: false,
  },
]

const adminScholarships: AdminScholarshipRow[] = ['horizonte-engenharia', 'pontes-ciencia', 'lideranca-gestao', 'economia-criativa'].map((slug) => {
  const s = demoScholarships.find((x) => x.slug === slug)!
  const short: Record<string, string> = {
    'horizonte-engenharia': 'Horizonte para Engenharia',
    'pontes-ciencia': 'Programa Pontes',
    'lideranca-gestao': 'Liderança e Gestão',
    'economia-criativa': 'Economia Criativa',
  }
  return { id: s.id, slug, title: short[slug], deadline: s.deadline, verification: s.verification, active: true }
})

/* ----------------------------- utilitários ----------------------------- */

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function currentUser(): SessionUser | null {
  try {
    const email = sessionStorage.getItem(SESSION_KEY)
    return email ? (accounts[email] ?? null) : null
  } catch {
    return null
  }
}

class HttpError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(String(status))
  }
}
const fail = (status: number, message: string, errors?: Record<string, string[]>): never => {
  throw new HttpError(status, { message, errors })
}
const requireRole = (...roles: Role[]): SessionUser => {
  const u = currentUser()
  if (!u) return fail(401, 'Inicia sessão para continuar.')
  if (!roles.includes(u.role)) return fail(403, 'Sem permissão.')
  return u
}

type Params = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : typeof v === 'string' && v ? [v] : [])

function filterScholarships(p: Params) {
  const q = norm(str(p.q))
  let list = demoScholarships.filter((s) => {
    if (q && !norm(`${s.title} ${s.institution} ${s.area} ${s.country} ${s.summary ?? ''}`).includes(q)) return false
    if (p.pais && s.country !== p.pais) return false
    const niveis = arr(p.nivel)
    if (niveis.length && !niveis.includes(s.level)) return false
    if (p.area && s.area !== p.area) return false
    if (p.financiamento && s.funding !== p.financiamento) return false
    if (p.modalidade && s.modality !== p.modalidade) return false
    if (p.estado && callStatus(s.deadline) !== p.estado) return false
    if (p.verificacao && s.verification !== p.verificacao) return false
    if (p.prazoAte && s.deadline > str(p.prazoAte)) return false
    return true
  })
  const sort = str(p.sort) || 'prazo'
  if (sort === 'publicacao') list = [...list].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  else if (sort === 'relevancia') list = [...list].sort((a, b) => Number(b.verification === 'verificada') - Number(a.verification === 'verificada'))
  // "prazo" (predefinido): ordem curada de demonstração, definida pelo backend em produção.
  return list
}

function paginate<T>(list: T[], p: Params, defSize = 6) {
  const pageSize = Number(p.pageSize) || defSize
  const page = Math.max(1, Number(p.page) || 1)
  return { items: list.slice((page - 1) * pageSize, page * pageSize), total: list.length, page, pageSize }
}

function filterMentors(p: Params): Mentor[] {
  const q = norm(str(p.q))
  return demoMentors.filter((m) => {
    if (q && !norm(`${m.name} ${m.specialty} ${m.tags.join(' ')}`).includes(q)) return false
    if (p.especialidade && !norm(m.specialty).includes(norm(str(p.especialidade)))) return false
    if (p.idioma && !m.languages.includes(str(p.idioma))) return false
    if (p.modalidade && !m.modalities.some((x) => norm(x).includes(norm(str(p.modalidade))))) return false
    if (p.precoMax && m.priceFrom > Number(p.precoMax)) return false
    if (p.apenasVerificados === true || p.apenasVerificados === 'true') return m.verified
    return true
  })
}

function filterServices(p: Params): MentorService[] {
  const q = norm(str(p.q))
  return demoServices.filter((s) => {
    if (q && !norm(`${s.title} ${s.mentorName}`).includes(q)) return false
    if (p.tipo && s.kind !== p.tipo) return false
    if (p.modalidade && s.modality !== p.modalidade) return false
    if (p.especialidade && s.specialty !== p.especialidade) return false
    if (p.preco === 'ate-10000' && s.price > 10000) return false
    if (p.preco === 'ate-20000' && s.price > 20000) return false
    if (p.preco === 'mais-20000' && s.price <= 20000) return false
    if (p.verificacao === 'verificados' && !s.mentorVerified) return false
    if (p.verificacao === 'nao-verificados' && s.mentorVerified) return false
    return true
  })
}

/* ------------------------------- rotas -------------------------------- */

function route(method: string, url: string, params: Params, body: Record<string, unknown>): { status: number; data: unknown } {
  const ok = (data: unknown, status = 200) => ({ status, data })
  let m: RegExpMatchArray | null

  // Autenticação
  if (method === 'post' && url === '/auth/login') {
    const email = str(body.email).trim().toLowerCase()
    const password = str(body.password)
    const acc = accounts[email]
    if (!acc || password.length < 12) return fail(401, 'Credenciais inválidas.')
    sessionStorage.setItem(SESSION_KEY, email)
    return ok(acc)
  }
  if (method === 'post' && url === '/auth/register') {
    const email = str(body.email).trim().toLowerCase()
    if (accounts[email]) return fail(409, 'Não foi possível criar a conta com estes dados.')
    const name = str(body.name)
    accounts[email] = {
      id: `u${Object.keys(accounts).length + 10}`,
      name,
      email,
      role: body.role === 'mentor' ? 'mentor' : 'estudante',
      initials: name
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase(),
    }
    return ok({ message: 'Conta de demonstração criada.' }, 201)
  }
  if (method === 'post' && url === '/auth/logout') {
    sessionStorage.removeItem(SESSION_KEY)
    return ok(null, 204)
  }
  if (method === 'get' && url === '/auth/me') {
    const u = currentUser()
    return u ? ok(u) : fail(401, 'Sem sessão.')
  }
  if (method === 'post' && url === '/auth/forgot-password') return ok({ message: 'Pedido recebido.' }, 202) // resposta neutra
  if (method === 'post' && url === '/auth/reset-password') return fail(400, 'Este pedido já não é válido.') // sem sucesso simulado

  // Bolsas
  if (method === 'get' && url === '/scholarships') return ok(paginate(filterScholarships(params), params))
  if (method === 'get' && (m = url.match(/^\/scholarships\/([\w-]+)$/))) {
    const s = demoScholarships.find((x) => x.slug === m![1])
    return s ? ok(s) : fail(404, 'Bolsa não encontrada.')
  }

  // Favoritos e área do estudante
  if (method === 'get' && url === '/me/favorites') {
    requireRole('estudante')
    return ok(demoScholarships.filter((s) => favorites.has(s.slug)).sort((a, b) => demoSavedIds.indexOf(a.slug) - demoSavedIds.indexOf(b.slug)))
  }
  if ((m = url.match(/^\/me\/favorites\/([\w-]+)$/))) {
    requireRole('estudante')
    if (method === 'put') favorites.add(m[1])
    else if (method === 'delete') favorites.delete(m[1])
    return ok(null, 204)
  }
  if (method === 'delete' && url === '/me/favorites') {
    requireRole('estudante')
    favorites.clear()
    return ok(null, 204)
  }
  if (method === 'get' && url === '/me/recommendations') {
    requireRole('estudante')
    return ok(demoScholarships.filter((s) => ['horizonte-engenharia', 'futuro-digital'].includes(s.slug)))
  }
  if (url === '/me/profile') {
    requireRole('estudante')
    if (method === 'put') studentProfile = { ...studentProfile, ...(body as Partial<StudentProfile>) }
    return ok(studentProfile)
  }
  if (method === 'post' && url === '/me/data-requests') {
    requireRole('estudante')
    return ok({ message: 'Pedido registado.' }, 202)
  }
  if (url === '/me/preferences') {
    requireRole('estudante')
    if (method === 'put') preferences = { ...preferences, ...(body as Partial<Preferences>) }
    return ok(preferences)
  }

  // Mentores, serviços, denúncias, suporte
  if (method === 'get' && url === '/mentors') return ok(filterMentors(params))
  if (method === 'get' && (m = url.match(/^\/mentors\/([\w-]+)$/))) {
    const x = demoMentors.find((y) => y.slug === m![1])
    return x ? ok(x) : fail(404, 'Mentor não encontrado.')
  }
  if (method === 'get' && url === '/services') return ok(filterServices(params))
  if (method === 'post' && url === '/reports') return ok({ message: 'Denúncia recebida.' }, 202)
  if (method === 'post' && url === '/support') return ok({ message: 'Pedido recebido.' }, 202)

  // Área do mentor
  if (url.startsWith('/mentor/')) {
    requireRole('mentor')
    if (url === '/mentor/overview') {
      return ok({
        published: ownServices.filter((s) => s.state === 'publicado').length,
        drafts: ownServices.filter((s) => s.state === 'rascunho').length,
        disabled: ownServices.filter((s) => s.state === 'desactivado').length,
        services: ownServices,
        availabilityPeriod: availability.period,
        schedule: availability.schedule,
      })
    }
    if (method === 'put' && url === '/mentor/availability') {
      availability = { period: str(body.period) || availability.period, schedule: arr(body.schedule) }
      return ok(availability)
    }
    if (method === 'post' && url === '/mentor/profile/photo') return ok({ photo: mentorProfile.photo })
    if (method === 'post' && url === '/mentor/profile/review') return ok({ message: 'Pedido de revisão registado.' }, 202)
    if (url === '/mentor/profile') {
      if (method === 'put') mentorProfile = { ...mentorProfile, ...(body as Partial<MentorOwnProfile>) }
      return ok(mentorProfile)
    }
    if (method === 'post' && url === '/mentor/services') {
      const created = { ...(body as unknown as MentorServiceDraft), id: `own-${ownServices.length + 1}` }
      ownServices = [...ownServices, created]
      return ok(created, 201)
    }
    if ((m = url.match(/^\/mentor\/services\/([\w-]+)$/))) {
      const idx = ownServices.findIndex((s) => s.id === m![1])
      if (idx < 0) return fail(404, 'Serviço não encontrado.')
      if (method === 'put') ownServices[idx] = { ...ownServices[idx], ...(body as Partial<MentorServiceDraft>) }
      return ok(ownServices[idx])
    }
    if (method === 'post' && (m = url.match(/^\/mentor\/services\/([\w-]+)\/state$/))) {
      const idx = ownServices.findIndex((s) => s.id === m![1])
      if (idx < 0) return fail(404, 'Serviço não encontrado.')
      ownServices[idx] = { ...ownServices[idx], state: body.state as MentorServiceDraft['state'] }
      return ok(ownServices[idx])
    }
  }

  // Administração
  if (url.startsWith('/admin/')) {
    requireRole('admin')
    if (method === 'get') {
      if (url === '/admin/overview') return ok(demoAdminOverview)
      if (url === '/admin/users') return ok(demoAdminUsers)
      if (url === '/admin/mentor-reviews') return ok(demoMentorReviews)
      if (url === '/admin/scholarships') return ok(adminScholarships)
      if (url === '/admin/reports') return ok(demoReports)
      if (url === '/admin/integrations') return ok(demoIntegrations)
      if (url === '/admin/integration-logs') return ok(demoIntegrationLogs)
      if (url === '/admin/audit') return ok(demoAudit)
    } else {
      return ok({ message: 'Registado em ambiente de demonstração.' })
    }
  }

  return fail(404, 'Recurso não encontrado.')
}

export const demoAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? 'get').toLowerCase()
  const url = (config.url ?? '').split('?')[0]
  const params = (config.params ?? {}) as Params
  let body: Record<string, unknown> = {}
  try {
    body = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : (config.data ?? {})
  } catch {
    body = {}
  }
  await new Promise((r) => setTimeout(r, 180)) // latência simulada para estados de carregamento

  const response = (status: number, data: unknown) => ({ data, status, statusText: String(status), headers: {}, config, request: {} })
  try {
    const out = route(method, url, params, body)
    return response(out.status, out.data)
  } catch (e) {
    if (e instanceof HttpError) {
      const res = response(e.status, e.body)
      throw new AxiosError(`Request failed with status code ${e.status}`, e.status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST', config, {}, res)
    }
    throw e
  }
}
