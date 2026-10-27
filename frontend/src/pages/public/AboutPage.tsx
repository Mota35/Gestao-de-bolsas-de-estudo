import { Eye, HeartHandshake, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CheckList } from '../../components/ui/CheckList'
import { Notice } from '../../components/ui/Notice'
import { PageHeader } from '../../components/ui/PageHeader'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { env } from '../../lib/env'

const values = [
  { icon: Eye, t: 'Clareza', d: 'Estados, fontes, preços e prazos legíveis. Sem misturar verificação com candidatura.' },
  { icon: HeartHandshake, t: 'Respeito pelo percurso', d: 'Português simples, contexto angolano e orientação sem promessas irreais.' },
  { icon: ShieldCheck, t: 'Responsabilidade', d: 'Dados mínimos e contacto de mentores apenas quando autorizado.' },
]

export default function AboutPage() {
  useDocumentTitle('Sobre nós')
  const title = 'Oportunidades com mais clareza. Caminhos com mais apoio.'
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Início', to: '/' }, { label: 'Sobre nós', to: '/sobre-nos' }, { label: title }]}
        title={title}
        subtitle="Uma plataforma pensada para estudantes angolanos que querem dar o próximo passo na sua formação."
      />

      <section className="bg-page py-[56px] max-sm:py-10">
        <div className="wrap grid items-center gap-[56px] lg:grid-cols-[1fr_540px]">
          <div className="max-lg:order-2">
            <p className="eyebrow !font-bold">A nossa missão</p>
            <h2 className="display mt-[28px] max-w-[640px] text-[34px] leading-[40px] max-sm:text-[28px] max-sm:leading-9">
              O talento existe. A informação precisa de chegar mais longe.
            </h2>
            <p className="lead mt-[28px] max-w-[640px] text-[16px] leading-6">
              Procurar uma bolsa pode significar navegar por editais dispersos, prazos e requisitos pouco claros. A Kwanza Oportunidades aproxima essa informação de quem procura
              estudar.
            </p>
            <p className="lead mt-[24px] max-w-[640px] text-[16px] leading-6">
              Reunimos oportunidades, identificamos as fontes e damos espaço a profissionais que oferecem orientação paga. Não somos uma instituição financiadora nem decidimos quem
              recebe uma bolsa.
            </p>
          </div>
          <img
            src="/img/hero.jpg"
            alt="Estudantes a conversar num campus (imagem ilustrativa)"
            className="h-[400px] w-full rounded-2xl object-cover max-lg:order-1 max-sm:h-[260px]"
          />
        </div>
      </section>

      <section className="bg-white py-[56px] max-sm:py-10">
        <div className="wrap">
          <h2 className="h-page text-[28px] leading-9">O que orienta cada decisão</h2>
          <div className="mt-[34px] grid gap-6 md:grid-cols-3">
            {values.map(({ icon: Icon, t, d }) => (
              <article key={t} className="card p-6">
                <Icon size={26} strokeWidth={1.6} className="text-green" aria-hidden />
                <h3 className="mt-[19px] text-[22px] font-semibold leading-7 tracking-tight">{t}</h3>
                <p className="mt-[14px] text-[14px] leading-[21px] text-muted">{d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-page pb-[40px] pt-[56px] max-sm:pt-10">
        <div className="wrap">
          <div className="grid gap-8 lg:grid-cols-2">
            <article className="card p-6">
              <h3 className="display text-[24px] leading-8">Como tratamos as fontes</h3>
              <CheckList
                className="mt-[22px]"
                items={[
                  'Identificamos a instituição e a origem em cada bolsa.',
                  'A consulta da fonte tem uma data de referência.',
                  'Pendente significa que a revisão ainda não foi concluída.',
                  'Uma candidatura expirada é sempre marcada como expirada.',
                ]}
              />
              <p className="small mt-[22px] text-[13px]">O edital oficial prevalece sobre qualquer resumo da plataforma.</p>
            </article>
            <article className="card p-6">
              <h3 className="display text-[24px] leading-8">O que a verificação não significa</h3>
              <CheckList
                className="mt-[22px]"
                items={[
                  'Não garante a concessão de uma bolsa.',
                  'Não substitui a avaliação das condições do serviço.',
                  'Não é atribuída por pagamento do mentor.',
                  'Não autoriza a exposição de contactos sem consentimento.',
                ]}
              />
              <p className="small mt-[22px] text-[13px]">Os selos neste design são apenas estados ilustrativos.</p>
            </article>
          </div>

          {env.demoMode && (
            <Notice tone="info" title="Uma apresentação transparente" className="mt-[97px]">
              Este é um design estático: pessoas, instituições, oportunidades e dados de utilização são fictícios. Não existem candidaturas, pagamentos, integrações ou envios
              reais.
            </Notice>
          )}

          <div className={`${env.demoMode ? 'mt-[30px]' : 'mt-[40px]'} flex flex-wrap items-center justify-between gap-5`}>
            <div>
              <h2 className="h-page text-[28px] leading-9">Tens uma dúvida ou encontraste informação incorrecta?</h2>
              <p className="text-[16px] text-muted">Ajuda-nos a tornar a informação mais clara e segura.</p>
            </div>
            <Link to="/contactos" className="btn">
              Contactos e suporte
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
