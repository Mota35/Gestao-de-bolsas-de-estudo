import { ArrowUpRight, LogOut, Menu, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '../components/ui/Logo'
import { useAuth } from '../contexts/AuthContext'
import { env } from '../lib/env'
import { formatToday } from '../lib/format'

export type Area = 'estudante' | 'mentor' | 'admin'

const config: Record<Area, { label: string; base: string; items: Array<{ to: string; label: string; end?: boolean }>; help: boolean; access?: boolean }> = {
  estudante: {
    label: 'Área do estudante',
    base: '/estudante',
    help: true,
    items: [
      { to: '/estudante', label: 'Painel', end: true },
      { to: '/estudante/perfil', label: 'O meu perfil' },
      { to: '/estudante/guardadas', label: 'Bolsas guardadas' },
      { to: '/estudante/candidaturas', label: 'Candidaturas' },
      { to: '/cursos-e-mentorias', label: 'Cursos e mentorias' },
      { to: '/estudante/conta', label: 'Conta e preferências' },
    ],
  },
  mentor: {
    label: 'Área do mentor',
    base: '/mentor',
    help: true,
    items: [
      { to: '/mentor', label: 'Painel e serviços', end: true },
      { to: '/mentor/perfil', label: 'Perfil profissional' },
      { to: '/mentor/servicos/novo', label: 'Criar serviço' },
      { to: '/mentor/disponibilidade', label: 'Disponibilidade' },
    ],
  },
  admin: {
    label: 'Administração · restrito',
    base: '/admin',
    help: false,
    access: true,
    items: [
      { to: '/admin', label: 'Visão geral', end: true },
      { to: '/admin/utilizadores', label: 'Utilizadores e papéis' },
      { to: '/admin/mentores', label: 'Aprovação de mentores' },
      { to: '/admin/bolsas', label: 'Gestão de bolsas' },
      { to: '/admin/denuncias', label: 'Denúncias' },
      { to: '/admin/integracoes', label: 'Integrações' },
      { to: '/admin/auditoria', label: 'Auditoria autorizada' },
    ],
  },
}

function SidebarContent({ area, onNavigate, onLogout }: { area: Area; onNavigate?: () => void; onLogout?: () => Promise<void> }) {
  const c = config[area]
  const cls = ({ isActive }: { isActive: boolean }) => `side-link ${isActive ? 'active' : ''}`
  return (
    <>
      <div className="px-6 pt-[34px]">
        <Logo variant="side" to="/" />
        <p className="mt-[33px] text-[11px] font-bold uppercase tracking-[0.02em] text-white">{c.label}</p>
      </div>
      <nav aria-label={c.label} className="mt-[42px] flex flex-col px-6" onClick={onNavigate}>
        {c.items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end} className={cls}>
            {i.label}
          </NavLink>
        ))}
        <button type="button" className="side-link mt-2 inline-flex w-full items-center gap-3 text-left" onClick={() => { onNavigate?.(); void onLogout?.() }}>
          <LogOut size={16} aria-hidden /> Terminar sessão
        </button>
      </nav>
      <div className="mt-[36px] px-6 text-[12px] leading-[18px] text-[#b9cdd5]">
        {c.help ? (
          <>
            <p className="text-[13px] font-bold text-white">Precisa de orientação?</p>
            <p className="mt-[18px]">
              Consulta as{' '}
              <Link to="/perguntas-frequentes" className="underline-offset-2 hover:underline">
                perguntas frequentes
              </Link>{' '}
              ou contacta o{' '}
              <Link to="/contactos" className="underline-offset-2 hover:underline">
                suporte
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <p className="text-[13px] font-bold text-white">Acesso autorizado</p>
            <p className="mt-[18px]">Permissões por papel e acções registadas. Ambiente de demonstração.</p>
          </>
        )}
        <Link to="/" className="mt-[36px] inline-flex items-center gap-1 hover:text-white">
          Voltar ao site público <ArrowUpRight size={11} aria-hidden />
        </Link>
      </div>
    </>
  )
}

export function DashboardLayout({ area }: { area: Area }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  const userNode: ReactNode = (
    <span className="inline-flex items-center gap-3 text-[12px] text-green">
      <span aria-hidden className="relative inline-block h-[9px] w-[9px] rounded-full border-2 border-green">
        <span className="absolute inset-[1px] rounded-full bg-green" />
      </span>
      <span>{user?.name}</span>
    </span>
  )

  return (
    <div className="min-h-screen bg-mist lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen overflow-y-auto bg-deep lg:block" aria-label="Navegação da área">
        <SidebarContent area={area} onLogout={logout} />
      </aside>

      {/* Cabeçalho móvel */}
      <div className="flex h-[70px] items-center justify-between bg-white px-6 lg:hidden">
        <Logo to="/" />
        <div className="flex items-center gap-4 text-[12px] font-bold text-green">
          <span>PT / EN</span>
          <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-1 text-navy" aria-label="Terminar sessão">
            <LogOut size={16} aria-hidden /> <span className="sr-only">Terminar sessão</span>
          </button>
          <button type="button" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="text-navy">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="bg-deep pb-6 lg:hidden">
          <SidebarContent area={area} onNavigate={() => setOpen(false)} onLogout={logout} />
          <div className="px-6 pt-6">
            <button type="button" className="btn btn-sm btn-block" onClick={() => logout()}>
              Terminar sessão
            </button>
          </div>
        </div>
      )}

      <div className="min-w-0">
        <div className="hidden h-[88px] items-center justify-between border-b border-line bg-white px-10 lg:flex">
          <p className="text-[13px] text-muted">
            {formatToday()}
            {env.demoMode ? ' · Dados de demonstração' : ''}
          </p>
          <div className="flex items-center gap-[14px] text-[12px] font-normal text-green">
            <span>PT / EN</span>
            {userNode}
            <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-navy hover:bg-mist" aria-label="Terminar sessão">
              <LogOut size={15} aria-hidden /> Terminar sessão
            </button>
          </div>
        </div>
        <main className="px-10 pb-16 pt-[48px] max-lg:px-6 max-lg:pt-6">
          <Outlet />
        </main>
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-lg bg-[#0c2634] px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#174355]"
      >
        <LogOut size={17} aria-hidden /> Terminar sessão
      </button>
    </div>
  )
}

export function DashHead({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-[28px] flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-[5px] !text-[12px]">{eyebrow}</p>}
        <h1 className="h-page text-[30px] leading-[36px] max-lg:text-[32px] max-lg:leading-[38px]">{title}</h1>
        {subtitle && <p className="mt-[1px] text-[15px] leading-5 text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
