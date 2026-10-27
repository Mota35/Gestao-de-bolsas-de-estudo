import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loading } from '../components/ui/States'
import { homeForRole, useAuth } from '../contexts/AuthContext'
import type { Role } from '../types'

/**
 * Protege rotas por papel. É apenas uma conveniência de navegação:
 * a autorização real é sempre feita pelo backend.
 */
export function RequireRole({ role }: { role: Role }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading label="A verificar sessão…" />
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  if (user.role !== role) return <Navigate to={homeForRole(user.role)} replace />
  return <Outlet />
}
