import { api } from './api'
import type { User } from '../types'
import type { LoginInput, RegisterInput, ResetPasswordInput } from '../schemas'

export const authService = {
  async me(): Promise<User> {
    const { data } = await api.get<User>('/auth/me')
    return data
  },
  async login(input: LoginInput): Promise<User> {
    const { data } = await api.post<User>('/auth/login', input)
    return data
  },
  async register(input: Omit<RegisterInput, 'confirmPassword' | 'acceptTerms'>): Promise<User> {
    const { data } = await api.post<User>('/auth/register', input)
    return data
  },
  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },
  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email })
  },
  async resetPassword(input: { token: string } & Pick<ResetPasswordInput, 'password'>): Promise<void> {
    await api.post('/auth/reset-password', input)
  },
}
