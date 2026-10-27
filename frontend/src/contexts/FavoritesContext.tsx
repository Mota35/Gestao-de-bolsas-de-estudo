import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { favoriteService } from '../services'
import { getErrorMessage } from '../lib/errors'
import { useAuth } from './AuthContext'

interface FavoritesValue {
  saved: Set<string>
  toggle: (slug: string) => Promise<void>
  clearAll: () => Promise<boolean>
}

const FavoritesContext = createContext<FavoritesValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [saved, setSaved] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user?.role !== 'estudante') {
      setSaved(new Set())
      return
    }
    favoriteService
      .list()
      .then((l) => setSaved(new Set(l.map((s) => s.slug))))
      .catch(() => setSaved(new Set()))
  }, [user])

  const toggle = useCallback(
    async (slug: string) => {
      if (user?.role !== 'estudante') {
        toast.info('Inicia sessão como estudante para guardar bolsas.')
        return
      }
      const isSaved = saved.has(slug)
      try {
        if (isSaved) await favoriteService.remove(slug)
        else await favoriteService.add(slug)
        setSaved((prev) => {
          const next = new Set(prev)
          if (isSaved) next.delete(slug)
          else next.add(slug)
          return next
        })
        toast.success(isSaved ? 'Bolsa removida dos guardados.' : 'Bolsa guardada.')
      } catch (e) {
        toast.error(getErrorMessage(e))
      }
    },
    [saved, user],
  )

  const clearAll = useCallback(async () => {
    try {
      await favoriteService.clear()
      setSaved(new Set())
      toast.success('Seleção removida dos guardados.')
      return true
    } catch (e) {
      toast.error(getErrorMessage(e))
      return false
    }
  }, [])

  const value = useMemo(() => ({ saved, toggle, clearAll }), [saved, toggle, clearAll])
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites(): FavoritesValue {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites deve ser usado dentro de FavoritesProvider')
  return ctx
}
