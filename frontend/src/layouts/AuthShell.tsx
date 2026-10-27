import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Estrutura comum das páginas de registo, início de sessão e recuperação de senha. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-page pb-16 pt-[56px] max-lg:pt-8">
      <div className="wrap grid items-start gap-[72px] lg:grid-cols-[480px_1fr] lg:gap-[72px]">
        <div className="max-lg:hidden">
          <p className="mt-[3px] inline-flex items-center gap-1.5 text-[12px] font-semibold text-green">
            <span className="h-2 w-2 rounded-full bg-green" aria-hidden /> O próximo passo começa aqui
          </p>
          <h1 className="display mt-[26px] text-[44px] leading-[52px]">O teu futuro merece boas oportunidades.</h1>
          <p className="lead mt-[28px] text-[17px] leading-6">Organiza as tuas escolhas, encontra orientação e acompanha as fontes. Sem promessas fáceis.</p>
          <img src="/img/hero.jpg" alt="Estudantes a conversar num campus (imagem ilustrativa)" className="mt-[28px] h-[310px] w-[480px] rounded-2xl object-cover" />
          <p className="small mt-[26px] max-w-[480px]">Pessoas fictícias · Imagem ilustrativa · Nunca pedimos documentos privados para criar uma conta.</p>
        </div>
        <div>
          <section className="card p-8 max-sm:p-5">{children}</section>
          <p className="mt-[22px] text-center text-[12px] text-muted">
            <Link to="/privacidade" className="hover:underline">
              Privacidade
            </Link>{' '}
            ·{' '}
            <Link to="/termos" className="hover:underline">
              Termos de utilização
            </Link>{' '}
            ·{' '}
            <Link to="/contactos" className="hover:underline">
              Contactos e suporte
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export function AuthTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h1 className="h-light text-[32px] leading-[38px]">{title}</h1>
      <p className="mt-[1px] text-[14.5px] leading-6 text-muted">{subtitle}</p>
    </>
  )
}
