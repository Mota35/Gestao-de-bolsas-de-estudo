import { api } from './api'
import type { Paginated, Scholarship, ScholarshipFilters } from '../types'

function clean(params: ScholarshipFilters) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null),
  )
}

export const scholarshipService = {
  async list(filters: ScholarshipFilters): Promise<Paginated<Scholarship>> {
    const { data } = await api.get<Paginated<Scholarship>>('/scholarships', { params: clean(filters) })
    return data
  },
  async get(id: string): Promise<Scholarship> {
    const { data } = await api.get<Scholarship>(`/scholarships/${encodeURIComponent(id)}`)
    return data
  },
  async featured(): Promise<Scholarship[]> {
    const { data } = await api.get<Paginated<Scholarship>>('/scholarships', {
      params: { featured: true, pageSize: 6 },
    })
    return data.items
  },
  async recent(): Promise<Scholarship[]> {
    const { data } = await api.get<Paginated<Scholarship>>('/scholarships', {
      params: { sort: 'published', pageSize: 6 },
    })
    return data.items
  },
  async compatible(): Promise<Scholarship[]> {
    const { data } = await api.get<Paginated<Scholarship>>('/me/compatible-scholarships')
    return data.items
  },
}
