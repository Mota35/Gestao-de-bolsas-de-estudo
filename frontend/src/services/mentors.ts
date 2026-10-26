import { api } from './api'
import type { Mentor, MentorProfileInput, MentorService, Paginated, StudentProfile } from '../types'

export type ServiceInput = Omit<MentorService, 'id' | 'mentorId' | 'mentorName' | 'reported' | 'isDemo'>

export const mentorService = {
  async list(params: { q?: string; page?: number } = {}): Promise<Paginated<Mentor>> {
    const { data } = await api.get<Paginated<Mentor>>('/mentors', { params })
    return data
  },
  async get(id: string): Promise<Mentor> {
    const { data } = await api.get<Mentor>(`/mentors/${encodeURIComponent(id)}`)
    return data
  },
  async servicesOf(id: string): Promise<MentorService[]> {
    const { data } = await api.get<Paginated<MentorService>>('/mentor-services', { params: { mentorId: id, pageSize: 100 } })
    return data.items
  },
  // Área do mentor autenticado
  async myProfile(): Promise<Mentor> {
    const { data } = await api.get<Mentor>('/me/mentor')
    return data
  },
  async saveMyProfile(input: MentorProfileInput): Promise<Mentor> {
    const { data } = await api.put<Mentor>('/me/mentor', input)
    return data
  },
  async myServices(): Promise<MentorService[]> {
    const { data } = await api.get<MentorService[]>('/me/mentor/services')
    return data
  },
  async createService(input: ServiceInput): Promise<MentorService> {
    const { data } = await api.post<MentorService>('/me/mentor/services', input)
    return data
  },
  async updateService(id: string, input: ServiceInput): Promise<MentorService> {
    const { data } = await api.put<MentorService>(`/me/mentor/services/${encodeURIComponent(id)}`, input)
    return data
  },
  async setServicePublished(id: string, published: boolean): Promise<MentorService> {
    const { data } = await api.patch<MentorService>(`/me/mentor/services/${encodeURIComponent(id)}`, { published })
    return data
  },
  async deleteService(id: string): Promise<void> {
    await api.delete(`/me/mentor/services/${encodeURIComponent(id)}`)
  },
}

export const courseService = {
  async list(params: { q?: string; kind?: string; page?: number } = {}): Promise<Paginated<MentorService>> {
    const { data } = await api.get<Paginated<MentorService>>('/courses', { params: { q: params.q, page: params.page } })
    return data
  },
  async get(id: string): Promise<MentorService> {
    const { data } = await api.get<MentorService>(`/courses/${encodeURIComponent(id)}`)
    return data
  },
  async report(id: string, reason: string): Promise<void> {
    await api.post('/reports', { targetType: 'COURSE', targetId: id, reason: 'OTHER', details: reason })
  },
}

export const profileService = {
  async get(): Promise<StudentProfile> {
    const { data } = await api.get<StudentProfile>('/me/profile')
    return data
  },
  async save(input: StudentProfile): Promise<StudentProfile> {
    const { data } = await api.put<StudentProfile>('/me/profile', input)
    return data
  },
}
