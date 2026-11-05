import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '../components/ui/Logo'
import { useAuth, homeForRole } from '../contexts/AuthContext'
import { env } from '../lib/env'
import { LanguageSelect, languageText, useLanguage } from '../contexts/LanguageContext'

const nav = [
  { to: '/', label: 'Início', end: true },
  { to: '/bolsas', label: 'Bolsas' },
  { to: '/mentores', label: 'Mentores' },
  { to: '/cursos-e-mentorias', label: 'Cursos e mentorias' },
  { to: '/sobre-nos', label: 'Sobre nós' },
]

function Header() {
  const [open, setOpen] = useState(false)
  const { language } = useLanguage()
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
              {languageText(language, n.label, ({ 'Início': 'Home', 'Bolsas': 'Scholarships', 'Mentores': 'Mentors', 'Cursos e mentorias': 'Courses and mentoring', 'Sobre nós': 'About us' } as Record<string, string>)[n.label] ?? n.label)}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3.5 text-[12px] font-bold text-green max-lg:flex-1 max-lg:justify-center">
          <LanguageSelect />
          {user ? (
            <Link to={homeForRole(user.role)} className="max-lg:hidden">
              {languageText(language, 'A minha área', 'My dashboard')}
            </Link>
          ) : (
            <Link to="/entrar" className="max-lg:hidden">
              {languageText(language, 'Entrar', 'Sign in')}
            </Link>
          )}
        </div>
        <Link to={user ? homeForRole(user.role) : '/registo'} className="btn btn-primary btn-sm !min-h-[38px] !px-3.5 max-lg:hidden">
          {languageText(language, user ? 'Abrir painel' : 'Criar conta', user ? 'Open dashboard' : 'Create account')}
        </Link>
          <button type="button" className="hidden p-1 max-lg:block" aria-label={languageText(language, open ? 'Fechar menu' : 'Abrir menu', open ? 'Close menu' : 'Open menu')} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
        {open && (
          <div className="absolute inset-x-0 top-full z-20 border-t border-line bg-white p-4 shadow-lg lg:hidden">
            <nav aria-label="Menu móvel" className="flex flex-col">
              {nav.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link py-3 ${isActive ? 'active' : ''}`}>
                  {languageText(language, n.label, ({ 'Início': 'Home', 'Bolsas': 'Scholarships', 'Mentores': 'Mentors', 'Cursos e mentorias': 'Courses and mentoring', 'Sobre nós': 'About us' } as Record<string, string>)[n.label] ?? n.label)}
                </NavLink>
              ))}
              <div className="mt-2 flex gap-3 border-t border-line pt-4">
                {user ? (
                  <Link to={homeForRole(user.role)} className="btn btn-primary btn-sm flex-1">
                    {languageText(language, 'Abrir painel', 'Open dashboard')}
                  </Link>
                ) : (
                  <>
                    <Link to="/entrar" className="btn btn-sm flex-1">
                    {languageText(language, 'Entrar', 'Sign in')}
                    </Link>
                    <Link to="/registo" className="btn btn-primary btn-sm flex-1">
                    {languageText(language, 'Criar conta', 'Create account')}
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
    <footer className="bg-[#1d5273] text-[#d5e3eb]">
      <div className="wrap grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12 lg:py-16">
        <section>
          <h2 className="mb-6 text-[20px] font-bold text-white">Explorar</h2>
          <div className="flex flex-col items-start gap-3 text-[15px]">
            {groups[0][1].map(([text, to]) => <Link key={to} to={to} className="hover:text-white hover:underline">{text}</Link>)}
          </div>
        </section>
        <section>
          <h2 className="mb-6 text-[20px] font-bold text-white">A plataforma</h2>
          <div className="flex flex-col items-start gap-3 text-[15px]">
            {groups.slice(1).flatMap(([, links]) => links).map(([text, to]) => <Link key={to} to={to} className="hover:text-white hover:underline">{text}</Link>)}
          </div>
        </section>
        <section>
          <h2 className="mb-6 text-[20px] font-bold text-white">Kwanza Oportunidades</h2>
          <p className="max-w-sm text-[15px] leading-6">Mais clareza para escolher o próximo passo. Bolsas, orientação e pessoas que ajudam a avançar.</p>
          <Link to="/registo" className="mt-6 inline-flex min-h-12 items-center rounded-md bg-white px-5 font-semibold text-[#1d5273] hover:bg-[#edf4f7]">Criar conta</Link>
        </section>
      </div>
      <div className="bg-[#103246] py-8 text-center">
        <div className="wrap">
          <Logo variant="footer" />
          <p className="mt-3 text-[16px] font-semibold text-white">Bolsas, orientação e oportunidades em Angola</p>
          <p className="mt-7 text-[13px]">© 2026 Kwanza Oportunidades · Angola · PT / EN</p>
          <p className="mx-auto mt-2 max-w-2xl text-[12px] leading-5">{env.demoMode
            ? 'Design demonstrativo. Pessoas, oportunidades e números fictícios. Sem envios ou ligações activas.'
            : 'Consulta sempre a fonte oficial antes de te candidatares.'}</p>
        </div>
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
      <Header />
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      {!bare && <Footer />}
    </div>
  )
}
