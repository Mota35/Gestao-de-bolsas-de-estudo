import { api } from './api'
import type { User } from '../types'
import type { LoginInput, RegisterInput, ResetPasswordInput } from '../schemas'

export const authService = {
  async me(): Promise<User> {
    const { data } = await api.get<User>('/users/me')
    return normalizeUser(data)
  },
  async login(input: LoginInput): Promise<User> {
    const { data } = await api.post<User>('/auth/login', input)
    return normalizeUser(data)
  },
  async register(input: Omit<RegisterInput, 'confirmPassword' | 'acceptTerms'>): Promise<User> {
    const { role, ...payload } = input
    const { data } = await api.post<User>(`/auth/register/${role}`, payload)
    return normalizeUser(data)
  },
  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },
  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email })
  },
  async resetPassword(input: { token: string } & Pick<ResetPasswordInput, 'password'>): Promise<void> {
    await api.post('/auth/reset-password', { token: input.token, newPassword: input.password })
  },
  async verifyEmail(token: string): Promise<void> {
    await api.post('/auth/verify-email', { token })
  },
}

function normalizeUser(user: User): User {
  return { ...user, role: user.role.toLowerCase() as User['role'] }
}
