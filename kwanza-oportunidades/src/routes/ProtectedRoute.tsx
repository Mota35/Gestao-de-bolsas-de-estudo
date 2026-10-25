import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from '../components/ui'
import type { Role } from '../types'

/**
 * Protecção apenas de experiência de utilizador. A autorização real
 * é sempre aplicada pelo backend; esconder rotas não é segurança.
 */
export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Spinner label="A verificar sessão…" />
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}
