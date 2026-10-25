import axios, { AxiosError } from 'axios'
import type { ApiErrorBody } from '../types'

const baseURL = import.meta.env.VITE_API_URL as string | undefined

if (!baseURL) {
  // eslint-disable-next-line no-console
  console.warn('VITE_API_URL não definido. Copie .env.example para .env.')
}

/**
 * Cliente HTTP único. A sessão é mantida por cookies HttpOnly/SameSite
 * definidos pelo backend; por isso usamos withCredentials e nunca
 * guardamos tokens no localStorage.
 */
export const api = axios.create({
  baseURL: baseURL ?? '',
  withCredentials: true,
  headers: { Accept: 'application/json' },
  timeout: 20000,
})

export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string[]>
  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const defaultMessages: Record<number, string> = {
  400: 'Pedido inválido. Verifique os dados e tente novamente.',
  401: 'A sessão expirou ou não iniciou sessão. Entre novamente.',
  403: 'Não tem permissão para realizar esta acção.',
  404: 'O conteúdo pedido não foi encontrado.',
  409: 'Existe um conflito com os dados actuais (por exemplo, um registo duplicado).',
  422: 'Alguns campos não são válidos. Corrija-os e tente novamente.',
  500: 'Ocorreu um erro no servidor. Tente novamente mais tarde.',
}

type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | null = null
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  onUnauthorized = fn
}

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError<ApiErrorBody>) => {
    if (!error.response) {
      return Promise.reject(
        new ApiError(0, 'Sem ligação ao servidor. Verifique a sua internet e tente novamente.'),
      )
    }
    const { status, data } = error.response
    if (status === 401 && onUnauthorized) onUnauthorized()
    const message =
      data?.message || defaultMessages[status] || (status >= 500 ? defaultMessages[500] : 'Erro inesperado.')
    return Promise.reject(new ApiError(status, message, data?.errors))
  },
)

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Erro inesperado.'
}
