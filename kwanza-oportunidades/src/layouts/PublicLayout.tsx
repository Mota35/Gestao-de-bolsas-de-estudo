import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

const links = [
  { to: '/bolsas', label: 'Bolsas' },
  { to: '/mentores', label: 'Mentores' },
  { to: '/cursos', label: 'Cursos e mentorias' },
  { to: '/sobre', label: 'Sobre nós' },
  { to: '/faq', label: 'Perguntas frequentes' },
  { to: '/contactos', label: 'Contactos' },
]

export function PublicLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const area = user?.role === 'admin' ? '/admin' : user?.role === 'mentor' ? '/mentor' : '/estudante'

  async function handleLogout() {
    await logout()
    toast.success('Sessão terminada.')
    navigate('/')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-100 text-brand-700' : 'text-slate-700 hover:bg-slate-100'}`

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Saltar para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold text-brand-700">
            Kwanza <span className="text-gold-500">Oportunidades</span>
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
            {links.map((l) => <NavLink key={l.to} to={l.to} className={linkClass}>{l.label}</NavLink>)}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <>
                <Link to={area} className="btn-outline">A minha área</Link>
                <button type="button" onClick={() => void handleLogout()} className="btn-primary">Terminar sessão</button>
              </>
            ) : (
              <>
                <Link to="/entrar" className="btn-outline">Entrar</Link>
                <Link to="/registo" className="btn-primary">Criar conta</Link>
              </>
            )}
          </div>
          <button
            type="button"
            className="rounded-md p-2 lg:hidden"
            aria-expanded={open}
            aria-controls="menu-movel"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <div id="menu-movel" className="border-t border-slate-200 px-4 py-3 lg:hidden">
            <nav aria-label="Principal móvel" className="flex flex-col gap-1">
              {links.map((l) => <NavLink key={l.to} to={l.to} className={linkClass} onClick={() => setOpen(false)}>{l.label}</NavLink>)}
              {user ? (
                <>
                  <Link to={area} className="btn-outline mt-2" onClick={() => setOpen(false)}>A minha área</Link>
                  <button type="button" className="btn-primary" onClick={() => void handleLogout()}>Terminar sessão</button>
                </>
              ) : (
                <>
                  <Link to="/entrar" className="btn-outline mt-2" onClick={() => setOpen(false)}>Entrar</Link>
                  <Link to="/registo" className="btn-primary" onClick={() => setOpen(false)}>Criar conta</Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="bg-brand-900 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Kwanza Oportunidades. Todos os direitos reservados.</p>
          <p>Confirme sempre as informações na fonte oficial antes de se candidatar.</p>
        </div>
      </footer>
    </div>
  )
}
