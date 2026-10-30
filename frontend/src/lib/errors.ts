import axios from 'axios'
import type { ApiErrorBody } from '../types'

/** Mensagens compreensíveis para os códigos tratados: 400, 401, 403, 404, 409, 422 e 500. */
export function getErrorMessage(error: unknown, fallback = 'Algo correu mal. Tenta novamente dentro de instantes.'): string {
  if (!axios.isAxiosError(error)) return fallback
  const status = error.response?.status
  const body = error.response?.data as ApiErrorBody | undefined
  const serverMessage = body?.error?.message ?? body?.message
  const details = body?.error?.details?.map((item) => item.field ? `${item.field}: ${item.message ?? ''}` : item.message ?? '').filter(Boolean)
  switch (status) {
    case 400:
      return details?.length ? `${serverMessage ?? 'Dados inválidos.'} ${details.join(' · ')}` : serverMessage ?? 'O pedido não é válido. Verifica os dados e tenta novamente.'
    case 401:
      return body?.message ?? 'A sessão terminou ou os dados de acesso não estão correctos.'
    case 403:
      return 'Não tens permissão para esta acção.'
    case 404:
      return 'Não encontrámos o que procuravas.'
    case 409:
      return serverMessage ?? 'Já existe um registo com estes dados.'
    case 422:
      return serverMessage ?? 'Alguns campos precisam de correcção.'
    case 500:
    case 502:
    case 503:
      return 'O servidor teve um problema. Tenta novamente mais tarde.'
    default:
      return error.code === 'ERR_NETWORK' ? 'Sem ligação ao servidor. Verifica a tua ligação.' : fallback
  }
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error) || error.response?.status !== 422) return {}
  const errs = (error.response.data as ApiErrorBody | undefined)?.errors ?? {}
  return Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]]))
}
