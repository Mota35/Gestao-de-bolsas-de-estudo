import { Link } from 'react-router-dom'
import { Notice } from '../../components/ui/Notice'
import { PageHeader } from '../../components/ui/PageHeader'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { env } from '../../lib/env'

type Kind = 'fontes' | 'privacidade' | 'termos'

const content: Record<Kind, { title: string; subtitle: string; path: string; sections: Array<{ h: string; p: string }> }> = {
  fontes: {
    title: 'Fontes e verificação',
    subtitle: 'Como identificamos a origem da informação e o que cada estado significa.',
    path: '/fontes-e-verificacao',
    sections: [
      { h: 'A fonte vem primeiro', p: 'Cada oportunidade indica a instituição e a origem da informação. O edital oficial prevalece sempre sobre qualquer resumo da plataforma.' },
      {
        h: 'Verificação e candidatura são estados diferentes',
        p: '“Pendente” refere-se à revisão da fonte. “Aberta” ou “expirada” refere-se ao período de candidatura. Uma bolsa com prazo ultrapassado nunca é apresentada como aberta.',
      },
      {
        h: 'O que a verificação não garante',
        p: 'Não garante a concessão de uma bolsa, a qualidade de um serviço nem uma decisão favorável. Também não é atribuída por pagamento.',
      },
    ],
  },
  privacidade: {
    title: 'Privacidade',
    subtitle: 'Recolhemos apenas os dados necessários para o funcionamento da tua conta.',
    path: '/privacidade',
    sections: [
      {
        h: 'Dados mínimos',
        p: 'Pedimos nome, email e, se quiseres sugestões, nacionalidade, nível, área de estudo e país pretendido. Não pedimos documentos pessoais, passaportes, identificação nem dados bancários.',
      },
      { h: 'Contacto de mentores', p: 'O número de WhatsApp de um mentor só é apresentado com autorização explícita e separada, que pode ser retirada a qualquer momento.' },
      { h: 'Sessão e senhas', p: 'A sessão é gerida pelo servidor através de cookies seguros. Nunca guardamos senhas ou tokens no navegador e o suporte nunca pede a tua senha.' },
      { h: 'Os teus direitos', p: 'Podes pedir uma cópia dos teus dados ou a eliminação da conta em Conta e preferências.' },
    ],
  },
  termos: {
    title: 'Termos de utilização',
    subtitle: 'Regras simples para uma plataforma de confiança.',
    path: '/termos',
    sections: [
      {
        h: 'O que somos',
        p: 'Uma plataforma de informação sobre bolsas e de contacto com mentores. Não somos uma instituição financiadora e não decidimos quem recebe uma bolsa.',
      },
      { h: 'Candidaturas', p: 'As candidaturas são feitas nos portais oficiais das instituições. A plataforma não recolhe nem submete documentos de candidatura.' },
      { h: 'Mentorias e cursos', p: 'Os preços e condições são definidos por cada mentor e acordados directamente. Serviços pagos não dão acesso privilegiado a bolsas.' },
      {
        h: 'Conteúdo e denúncias',
        p: 'Podes denunciar perfis, cursos ou mentorias que prometam aprovação garantida, tenham preços pouco claros ou exponham contactos sem autorização.',
      },
    ],
  },
}

export default function LegalPage({ kind }: { kind: Kind }) {
  const c = content[kind]
  useDocumentTitle(c.title)
  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Início', to: '/' },
          { label: c.title, to: c.path },
        ]}
        title={c.title}
        subtitle={c.subtitle}
      />
      <div className="bg-page pb-[56px] pt-[40px]">
        <div className="wrap max-w-[860px] space-y-6">
          {env.demoMode && (
            <Notice tone="info" title="Texto de demonstração">
              Este conteúdo é um resumo ilustrativo e deve ser revisto antes da publicação.
            </Notice>
          )}
          {c.sections.map((s) => (
            <section key={s.h} className="card p-6">
              <h2 className="display text-[22px] leading-8">{s.h}</h2>
              <p className="mt-3 text-[15px] leading-6 text-muted">{s.p}</p>
            </section>
          ))}
          <p className="small text-[13px]">
            Tens dúvidas? Consulta as{' '}
            <Link to="/perguntas-frequentes" className="underline">
              perguntas frequentes
            </Link>{' '}
            ou os{' '}
            <Link to="/contactos" className="underline">
              contactos e suporte
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  )
}
