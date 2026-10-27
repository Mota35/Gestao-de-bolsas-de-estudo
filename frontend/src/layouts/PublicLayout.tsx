import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '../components/ui/Logo'
import { useAuth, homeForRole } from '../contexts/AuthContext'
import { env } from '../lib/env'
import { formatToday } from '../lib/format'

const nav = [
  { to: '/', label: 'Início', end: true },
  { to: '/bolsas', label: 'Bolsas' },
  { to: '/mentores', label: 'Mentores' },
  { to: '/cursos-e-mentorias', label: 'Cursos e mentorias' },
  { to: '/sobre-nos', label: 'Sobre nós' },
]

function Header() {
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const { pathname } = useLocation()
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  const navCls = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'active' : ''}`
  return (
    <header className="border-b border-line bg-white">
      <div className="wrap relative flex h-[90px] items-center justify-between max-lg:h-[72px]">
        <Logo />
        <nav aria-label="Principal" className="flex gap-[18px] max-lg:hidden">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={navCls}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3.5 text-[12px] font-bold text-green max-lg:flex-1 max-lg:justify-center">
          <span title="Idioma: português (alternativa em inglês indisponível nesta versão)">PT / EN</span>
          {user ? (
            <Link to={homeForRole(user.role)} className="max-lg:hidden">
              A minha área
            </Link>
          ) : (
            <Link to="/entrar" className="max-lg:hidden">
              Entrar
            </Link>
          )}
        </div>
        <Link to={user ? homeForRole(user.role) : '/registo'} className="btn btn-primary btn-sm !min-h-[38px] !px-3.5 max-lg:hidden">
          {user ? 'Abrir painel' : 'Criar conta'}
        </Link>
        <button type="button" className="hidden p-1 max-lg:block" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
        {open && (
          <div className="absolute inset-x-0 top-full z-20 border-t border-line bg-white p-4 shadow-lg lg:hidden">
            <nav aria-label="Menu móvel" className="flex flex-col">
              {nav.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link py-3 ${isActive ? 'active' : ''}`}>
                  {n.label}
                </NavLink>
              ))}
              <div className="mt-2 flex gap-3 border-t border-line pt-4">
                {user ? (
                  <Link to={homeForRole(user.role)} className="btn btn-primary btn-sm flex-1">
                    Abrir painel
                  </Link>
                ) : (
                  <>
                    <Link to="/entrar" className="btn btn-sm flex-1">
                      Entrar
                    </Link>
                    <Link to="/registo" className="btn btn-primary btn-sm flex-1">
                      Criar conta
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export function Footer() {
  const groups: Array<[string, Array<[string, string]>]> = [
    [
      'EXPLORAR',
      [
        ['Bolsas de estudo', '/bolsas'],
        ['Mentores', '/mentores'],
        ['Cursos e mentorias', '/cursos-e-mentorias'],
      ],
    ],
    [
      'A PLATAFORMA',
      [
        ['Sobre nós', '/sobre-nos'],
        ['Contactos e suporte', '/contactos'],
        ['Perguntas frequentes', '/perguntas-frequentes'],
      ],
    ],
    [
      'SEGURANÇA',
      [
        ['Fontes e verificação', '/fontes-e-verificacao'],
        ['Privacidade', '/privacidade'],
        ['Termos de utilização', '/termos'],
      ],
    ],
  ]
  return (
    <footer className="bg-deep text-[#b9cdd5]">
      <div className="wrap pb-[44px] pt-[56px]">
        <Logo variant="footer" />
        <p className="mt-[7px] text-[14px] leading-5">Mais clareza para escolher o próximo passo. Bolsas, orientação e pessoas que ajudam a avançar.</p>
        <div className="mt-7 space-y-[8px] text-[13px] leading-[18px]">
          {groups.map(([label, links]) => (
            <p key={label}>
              <span className="mr-3.5 inline-block">{label}</span>
              {links.map(([text, to], i) => (
                <span key={to}>
                  {i > 0 && ' · '}
                  <Link to={to} className="hover:text-white hover:underline">
                    {text}
                  </Link>
                </span>
              ))}
            </p>
          ))}
        </div>
        <p className="mt-[30px] text-[11px] leading-[17px]">
          © 2026 Kwanza Oportunidades · Angola · PT / EN
          <br />
          {env.demoMode
            ? 'Design demonstrativo. Pessoas, oportunidades e números fictícios. Sem envios ou ligações activas.'
            : 'Consulta sempre a fonte oficial antes de te candidatares.'}
        </p>
      </div>
    </footer>
  )
}

export function PublicLayout({ bare = false }: { bare?: boolean }) {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">
        Saltar para o conteúdo
      </a>
      <div className="bg-navy text-[11.5px] leading-[33px] text-[#c9d6dd] max-lg:text-[11px]">
        <div className="wrap">
          <span className="max-lg:hidden">Plataforma educacional para Angola{env.demoMode ? ` · Conteúdo de demonstração · ${formatToday()}` : ''}</span>
          <span className="lg:hidden">{env.demoMode ? `Conteúdo ilustrativo · ${formatToday().replace(' de outubro de ', ' out. ')}` : 'Plataforma educacional para Angola'}</span>
        </div>
      </div>
      <Header />
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      {!bare && <Footer />}
    </div>
  )
}
