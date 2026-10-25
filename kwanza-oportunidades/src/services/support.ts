import { api } from './api'
import type { ContactInput } from '../schemas'

export const supportService = {
  async sendMessage(input: ContactInput): Promise<void> {
    await api.post('/support/messages', input)
  },
}
