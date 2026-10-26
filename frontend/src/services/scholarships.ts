import { api } from './api'
import type { Paginated, Scholarship, ScholarshipFilters } from '../types'

const levelMap: Record<string, Scholarship['level']> = { BACHELOR: 'bachelor', MASTER: 'master', DOCTORATE: 'phd', POSTDOC: 'phd', VOCATIONAL: 'technical', SHORT_COURSE: 'technical', OTHER: 'other' }
const fundingMap: Record<string, Scholarship['funding']> = { FULL: 'full', PARTIAL: 'partial', TUITION_ONLY: 'partial', STIPEND: 'partial', OTHER: 'other' }
const modeMap: Record<string, Scholarship['modality']> = { IN_PERSON: 'presential', ONLINE: 'online', HYBRID: 'hybrid' }

export function fromApi(row: any): Scholarship {
  return {
    id: row.id, title: row.title, institution: row.sponsoringInstitution,
    country: row.destinationCountry, level: levelMap[row.educationLevel?.[0]] ?? 'other',
    field: row.studyAreas?.join(', ') ?? '', funding: fundingMap[row.fundingType] ?? 'other',
    modality: modeMap[row.studyMode] ?? 'presential', deadline: row.applicationDeadline,
    publishedAt: row.createdAt, status: row.validity === 'OPEN' ? 'open' : row.validity === 'CLOSED' ? 'closed' : 'expired',
    verification: row.verification?.status === 'VERIFIED' ? 'verified' : row.verification?.status === 'REJECTED' ? 'rejected' : 'pending',
    sourceName: row.source?.name ?? 'Fonte oficial', sourceUrl: row.source?.url ?? row.officialUrl,
    applicationUrl: row.officialUrl, description: row.description,
    requirements: [row.eligibilityCriteria, ...(row.requiredDocuments ?? [])].filter(Boolean),
    isFavorite: row.isFavorite,
  } as Scholarship
}

function mapPage(result: Paginated<any>): Paginated<Scholarship> {
  return { ...result, items: (result.items ?? []).map(fromApi) }
}

function clean(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null),
  )
}

export const scholarshipService = {
  async list(filters: ScholarshipFilters): Promise<Paginated<Scholarship>> {
    const { level, field, modality, status, sort, ...rest } = filters
    const params = clean({ ...rest, level: level ? level.toUpperCase() : undefined, area: field, mode: modality?.toUpperCase(), state: status === 'expired' ? 'closed' : status,
      sort: sort === 'published' ? 'recent' : sort === 'deadline' ? 'deadline_asc' : 'recent' } as Record<string, unknown>)
    return mapPage((await api.get<Paginated<any>>('/scholarships', { params })).data)
  },
  async get(id: string): Promise<Scholarship> {
    return fromApi((await api.get<any>(`/scholarships/${encodeURIComponent(id)}`)).data)
  },
  async featured(): Promise<Scholarship[]> {
    const { data } = await api.get<Paginated<any>>('/scholarships', {
      params: { sort: 'recent', pageSize: 6 },
    })
    return data.items.map(fromApi)
  },
  async recent(): Promise<Scholarship[]> {
    const { data } = await api.get<Paginated<any>>('/scholarships', {
      params: { sort: 'recent', pageSize: 6 },
    })
    return data.items.map(fromApi)
  },
  async compatible(): Promise<Scholarship[]> {
    throw new Error('A API ainda não disponibiliza recomendações personalizadas de bolsas.')
  },
}
