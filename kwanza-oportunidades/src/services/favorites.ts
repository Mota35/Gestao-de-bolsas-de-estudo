import { api } from './api'
import type { Application, Scholarship } from '../types'

export const favoriteService = {
  async list(): Promise<Scholarship[]> {
    const { data } = await api.get<Scholarship[]>('/me/favorites')
    return data
  },
  async add(scholarshipId: string): Promise<void> {
    await api.put(`/me/favorites/${encodeURIComponent(scholarshipId)}`)
  },
  async remove(scholarshipId: string): Promise<void> {
    await api.delete(`/me/favorites/${encodeURIComponent(scholarshipId)}`)
  },
  async applications(): Promise<Application[]> {
    const { data } = await api.get<Application[]>('/me/applications')
    return data
  },
}
