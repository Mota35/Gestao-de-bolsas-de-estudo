import { api } from './api'
import type {
  AdminUser,
  AuditEntry,
  IntegrationStatus,
  Mentor,
  MentorService,
  Role,
  Scholarship,
  UsageReport,
} from '../types'
import type { ScholarshipAdminInput } from '../schemas'

export const adminService = {
  async users(): Promise<AdminUser[]> {
    return (await api.get<AdminUser[]>('/admin/users')).data
  },
  async setRole(id: string, role: Role): Promise<AdminUser> {
    return (await api.patch<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, { role })).data
  },
  async setActive(id: string, active: boolean): Promise<AdminUser> {
    return (await api.patch<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, { active })).data
  },
  async pendingMentors(): Promise<Mentor[]> {
    return (await api.get<Mentor[]>('/admin/mentors', { params: { verification: 'pending' } })).data
  },
  async reviewMentor(id: string, decision: 'approve' | 'reject', note?: string): Promise<void> {
    await api.post(`/admin/mentors/${encodeURIComponent(id)}/${decision}`, { note })
  },
  async scholarships(): Promise<Scholarship[]> {
    return (await api.get<Scholarship[]>('/admin/scholarships')).data
  },
  async createScholarship(input: ScholarshipAdminInput): Promise<Scholarship> {
    return (await api.post<Scholarship>('/admin/scholarships', input)).data
  },
  async updateScholarship(id: string, input: ScholarshipAdminInput): Promise<Scholarship> {
    return (await api.put<Scholarship>(`/admin/scholarships/${encodeURIComponent(id)}`, input)).data
  },
  async verifyScholarship(id: string): Promise<Scholarship> {
    return (await api.post<Scholarship>(`/admin/scholarships/${encodeURIComponent(id)}/verify`)).data
  },
  async setScholarshipActive(id: string, active: boolean): Promise<Scholarship> {
    return (await api.patch<Scholarship>(`/admin/scholarships/${encodeURIComponent(id)}`, { active })).data
  },
  async reportedServices(): Promise<MentorService[]> {
    return (await api.get<MentorService[]>('/admin/services', { params: { reported: true } })).data
  },
  async resolveReport(id: string, action: 'dismiss' | 'unpublish'): Promise<void> {
    await api.post(`/admin/services/${encodeURIComponent(id)}/${action}`)
  },
  async usageReport(): Promise<UsageReport> {
    return (await api.get<UsageReport>('/admin/reports/usage')).data
  },
  async integrations(): Promise<IntegrationStatus[]> {
    return (await api.get<IntegrationStatus[]>('/admin/integrations')).data
  },
  async audit(): Promise<AuditEntry[]> {
    return (await api.get<AuditEntry[]>('/admin/audit')).data
  },
}
