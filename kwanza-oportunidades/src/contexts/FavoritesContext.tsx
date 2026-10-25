import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { favoriteService } from '../services/favorites'
import { errorMessage } from '../services/api'
import { useAuth } from './AuthContext'

interface FavoritesState {
  ids: Set<string>
  isFavorite: (id: string) => boolean
  toggle: (id: string) => Promise<void>
}

const FavoritesContext = createContext<FavoritesState | undefined>(undefined)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ids, setIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) {
      setIds(new Set())
      return
    }
    favoriteService
      .list()
      .then((items) => setIds(new Set(items.map((s) => s.id))))
      .catch(() => setIds(new Set()))
  }, [user])

  const toggle = useCallback(
    async (id: string) => {
      const was = ids.has(id)
      try {
        if (was) await favoriteService.remove(id)
        else await favoriteService.add(id)
        setIds((prev) => {
          const next = new Set(prev)
          if (was) next.delete(id)
          else next.add(id)
          return next
        })
        toast.success(was ? 'Bolsa removida dos favoritos.' : 'Bolsa guardada nos favoritos.')
      } catch (e) {
        toast.error(errorMessage(e))
      }
    },
    [ids],
  )

  const value = useMemo(() => ({ ids, isFavorite: (id: string) => ids.has(id), toggle }), [ids, toggle])
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites(): FavoritesState {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites deve ser usado dentro de FavoritesProvider')
  return ctx
}
