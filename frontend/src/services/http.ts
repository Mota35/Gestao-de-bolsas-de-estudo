import axios from 'axios'
import { env } from '../lib/env'
import { demoAdapter } from './demoAdapter'

/**
 * Cliente HTTP central. A sessão é feita por cookies seguros (HttpOnly, SameSite) definidos
 * pelo backend: o frontend nunca guarda tokens em localStorage.
 */
export const http = axios.create({
  baseURL: env.apiUrl || '/api',
  withCredentials: true,
  headers: { Accept: 'application/json' },
  paramsSerializer: { indexes: null },
  timeout: 15000,
  ...(env.demoMode ? { adapter: demoAdapter } : {}),
})

export const UNAUTHORIZED_EVENT = 'kwanza:unauthorized'

// A API responde no formato { data, meta? }; expõe data às páginas e incorpora
// os metadados de paginação no objecto esperado pelo frontend.
http.interceptors.response.use((response) => {
  const payload = response.data
  if (payload && typeof payload === 'object' && 'data' in payload) {
    response.data = payload.meta && Array.isArray(payload.data)
      ? { items: payload.data, ...payload.meta }
      : payload.data
  }
  return response
})

http.interceptors.response.use(
  (r) => r,
  (error) => {
    // Sessão expirada: avisa o contexto de autenticação (ignora o próprio pedido de sessão/login).
    const url: string = error?.config?.url ?? ''
    if (error?.response?.status === 401 && !url.startsWith('/auth/')) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(error)
  },
)
