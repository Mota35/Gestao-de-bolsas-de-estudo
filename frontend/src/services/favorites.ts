import { api } from './api'
import type { Application, Paginated, Scholarship } from '../types'
import { fromApi } from './scholarships'

export const favoriteService = {
  async list(): Promise<Scholarship[]> {
    const { data } = await api.get<Paginated<{ scholarship: any }>>('/me/favorites')
    return data.items.map(({ scholarship }) => fromApi(scholarship))
  },
  async add(scholarshipId: string): Promise<void> {
    await api.put(`/me/favorites/${encodeURIComponent(scholarshipId)}`)
  },
  async remove(scholarshipId: string): Promise<void> {
    await api.delete(`/me/favorites/${encodeURIComponent(scholarshipId)}`)
  },
  async applications(): Promise<Application[]> {
    throw new Error('A API ainda não disponibiliza a funcionalidade de candidaturas acompanhadas.')
  },
}
