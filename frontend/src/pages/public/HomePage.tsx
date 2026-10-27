import { BadgeCheck, Check, Compass, GraduationCap, Link2, Lock, Search, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MentorCard } from '../../components/MentorCard'
import { ScholarshipCard } from '../../components/ScholarshipCard'
import { FaqItem } from '../../components/ui/Faq'
import { Notice } from '../../components/ui/Notice'
import { ErrorState, Loading } from '../../components/ui/States'
import { SelectField } from '../../components/ui/Field'
import { countries } from '../../data/options'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { env } from '../../lib/env'
import { callStatus, formatDate, fundingLabel, levelLabel } from '../../lib/format'
import { mentorService, scholarshipService } from '../../services'

function Eyebrow({ children, light = false }: { children: string; light?: boolean }) {
  return <p className={`eyebrow mb-[6px] ${light ? '!text-[#5fd0a5]' : ''}`}>{children}</p>
}

function Hero() {
  return (
    <section className="bg-white">
      <div className="wrap grid items-center gap-x-[76px] pb-[48px] pt-[64px] lg:grid-cols-[1fr_596px] max-lg:pb-8 max-lg:pt-6">
        <div className="max-lg:order-1">
          <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-green">
            <span className="h-2 w-2 rounded-full bg-green" aria-hidden />
            <span className="max-lg:hidden">De Angola para novas possibilidades</span>
            <span className="lg:hidden">De Angola para o mundo</span>
          </p>
          <h1 className="display mt-[20px] text-[56px] leading-[66px] max-lg:mt-4 max-lg:text-[40px] max-lg:leading-[44px]">O teu próximo passo começa com uma oportunidade.</h1>
          <p className="lead mt-[30px] max-w-[560px] text-[18px] leading-[27px] max-lg:mt-6">
            Descobre bolsas de estudo e encontra mentores para preparar o teu caminho, com informação clara e fontes à vista.
          </p>
          <div className="mt-[34px] flex flex-wrap gap-3 max-lg:flex-col">
            <Link to="/bolsas" className="btn btn-primary">
              <Search size={18} aria-hidden /> Encontrar uma bolsa
            </Link>
            <Link to="/mentores" className="btn">
              Conhecer mentores
            </Link>
          </div>
          <p className="small mt-[24px] max-lg:hidden">Explorar é gratuito. As mentorias têm preços definidos por cada mentor.</p>
        </div>
        <div className="max-lg:order-2 max-lg:mt-6">
          <img
            src="/img/hero.jpg"
            alt="Três estudantes angolanos a conversar à mesa num campus (imagem ilustrativa)"
            className="h-[440px] w-full rounded-2xl object-cover max-lg:h-[270px]"
          />
          <p className="mt-[16px] flex items-center gap-3 text-[14px] text-muted max-lg:hidden">
            <Compass size={20} strokeWidth={1.6} className="text-green" aria-hidden /> Talento angolano. Horizontes sem fronteiras.
          </p>
        </div>
        <p className="small order-3 mt-6 lg:hidden">Explorar é gratuito. Mentorias podem ser pagas.</p>
      </div>
    </section>
  )
}

function SearchBand() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [pais, setPais] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (pais) p.set('pais', pais)
    navigate(`/bolsas${p.toString() ? `?${p}` : ''}`)
  }
  return (
    <section className="bg-mint text-ink lg:bg-navy lg:text-white" aria-labelledby="busca-titulo">
      <form onSubmit={submit} className="wrap pb-[33px] pt-[36px] max-lg:pb-6 max-lg:pt-8">
        <h2 id="busca-titulo" className="text-[22px] font-bold leading-7 max-lg:text-[26px]">
          Que oportunidade procuras?
        </h2>
        <div className="mt-[22px] grid items-center gap-4 lg:grid-cols-[1fr_270px_185px] max-lg:mt-5">
          <label className="field !min-h-[76px]">
            <span className="field-label">
              <span className="max-lg:hidden">Nome, instituição ou palavra-chave</span>
              <span className="lg:hidden">Nome ou palavra-chave</span>
            </span>
            <input className="field-control" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: Engenharia, Portugal, mestrado" />
          </label>
          <SelectField label="País de destino" value={pais} onChange={setPais} options={countries} placeholder="Todos os países" />
          <button type="submit" className="btn btn-primary !min-h-[48px] w-full">
            <Search size={18} aria-hidden /> Pesquisar bolsas
          </button>
        </div>
        <p className="mt-[20px] text-[13px] text-muted lg:text-[#b9cdd5]">
          Licenciatura<span className="lg:hidden">, mestrado, doutoramento, cursos técnicos e outros.</span>
          <span className="max-lg:hidden"> · Mestrado · Doutoramento · Cursos técnicos · Outros</span>
        </p>
      </form>
    </section>
  )
}

function Featured() {
  const { data, loading, error, reload } = useAsync(() => scholarshipService.list({ pageSize: 3 }), [])
  return (
    <section className="bg-mist py-16 max-lg:py-12">
      <div className="wrap">
        <div className="mb-[30px] flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Explora possibilidades</Eyebrow>
            <h2 className="h-page text-[30px] leading-9 max-lg:text-[32px]">
              <span className="max-lg:hidden">Bolsas que merecem a tua atenção</span>
              <span className="lg:hidden">Bolsas em destaque</span>
            </h2>
            <p className="mt-0.5 text-[15px] text-muted">
              {env.demoMode ? 'Exemplos com candidaturas abertas. Confirma sempre as condições na fonte oficial.' : 'Confirma sempre as condições na fonte oficial.'}
            </p>
          </div>
          <Link to="/bolsas" className="btn max-lg:hidden">
            Ver todas as bolsas
          </Link>
        </div>
        {loading && <Loading />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && (
          <div className="grid gap-5 md:grid-cols-3">
            {data.items.map((s) => (
              <ScholarshipCard key={s.id} s={s} />
            ))}
          </div>
        )}
        <Notice tone="info" title="A fonte vem primeiro" className="mt-[29px] !py-[18px]">
          {env.demoMode
            ? 'As oportunidades nesta apresentação são fictícias. “Verificada” representa um estado de demonstração, não uma validação real.'
            : 'Verificação e candidatura são estados diferentes. Consulta sempre a fonte oficial.'}
        </Notice>
      </div>
    </section>
  )
}

const steps = [
  { icon: Search, n: '01', t: 'Descobre', d: 'Filtra por nível, área, país e financiamento. Encontra o que faz sentido para ti.' },
  { icon: ShieldCheck, n: '02', t: 'Confirma', d: 'Consulta a fonte, os requisitos e o prazo. A candidatura é feita no site oficial.' },
  { icon: Compass, n: '03', t: 'Prepara-te', d: 'Guarda oportunidades e procura uma mentoria paga se precisares de orientação.' },
]

function Steps() {
  return (
    <section className="bg-white py-16 max-lg:hidden">
      <div className="wrap">
        <Eyebrow>Um caminho mais claro</Eyebrow>
        <h2 className="h-page text-[30px] leading-9">Da descoberta à preparação, passo a passo</h2>
        <ol className="mt-[34px] grid gap-5 md:grid-cols-3">
          {steps.map(({ icon: Icon, n, t, d }) => (
            <li key={n} className="card rounded-2xl !bg-mist px-7 pb-[30px] pt-6">
              <div className="flex items-start justify-between">
                <Icon size={24} strokeWidth={1.6} className="text-green" aria-hidden />
                <span className="text-[24px] font-light leading-8 text-muted">{n}</span>
              </div>
              <h3 className="display mt-[22px] text-[22px] leading-7">{t}</h3>
              <p className="mt-[16px] text-[14.5px] leading-[21px] text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Mentors() {
  const { data, loading, error, reload } = useAsync(() => mentorService.list({}), [])
  return (
    <section className="bg-mist py-16 max-lg:py-12">
      <div className="wrap">
        <div className="mb-[30px] flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Orientação com rosto humano</Eyebrow>
            <h2 className="h-page text-[30px] leading-9 max-lg:text-[32px]">Não tens de preparar tudo sozinho</h2>
            <p className="mt-0.5 text-[15px] text-muted">Conhece especialidades, preços e disponibilidade antes de escolher uma mentoria.</p>
          </div>
          <Link to="/mentores" className="btn max-lg:hidden">
            Explorar mentores
          </Link>
        </div>
        {loading && <Loading />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {data && (
          <div className="grid gap-5 md:grid-cols-3">
            {data.slice(0, 3).map((m) => (
              <MentorCard key={m.slug} m={m} />
            ))}
          </div>
        )}
        <Link to="/mentores" className="btn btn-block mt-5 lg:hidden">
          Explorar mentores
        </Link>
      </div>
    </section>
  )
}

function Guide() {
  const items = ['Confirmar elegibilidade e financiamento', 'Anotar o prazo no calendário', 'Preparar documentos apenas para o site oficial', 'Pedir orientação quando necessário']
  return (
    <section className="bg-beige py-[56px] max-lg:py-8">
      <div className="wrap grid items-center gap-[60px] lg:grid-cols-[1fr_518px]">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted">
            <span className="h-2 w-2 rounded-full bg-muted" aria-hidden /> Guia do estudante
          </p>
          <h2 className="display mt-[18px] max-w-[640px] text-[36px] leading-[40px] max-lg:text-[32px]">
            <span className="max-lg:hidden">Uma candidatura forte começa antes do prazo.</span>
            <span className="lg:hidden">Prepara antes do prazo.</span>
          </h2>
          <p className="lead mt-[28px] max-w-[640px] text-[16.5px] leading-6 max-lg:hidden">
            Lê os requisitos com calma, organiza uma lista de documentos e reserva tempo para rever a tua carta de motivação.
          </p>
          <Link to="/perguntas-frequentes" className="btn mt-[30px] max-lg:hidden">
            Ler perguntas frequentes
          </Link>
        </div>
        <div className="card p-7 pb-[26px] max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none">
          <h3 className="mb-[18px] text-[20px] font-bold leading-7 max-lg:hidden">A tua lista de preparação</h3>
          <ul className="space-y-[14px]">
            {items.map((i, idx) => (
              <li key={i} className={`flex items-center gap-[14px] text-[14.5px] ${idx > 2 ? 'max-lg:hidden' : ''}`}>
                <Check size={18} className="text-green" aria-hidden /> {i}
              </li>
            ))}
          </ul>
          <p className="small mt-[18px] max-lg:hidden">A Kwanza não recolhe documentos de candidatura.</p>
        </div>
        <Link to="/perguntas-frequentes" className="btn btn-block lg:hidden">
          Ler perguntas frequentes
        </Link>
      </div>
    </section>
  )
}

function Latest() {
  const { data } = useAsync(() => scholarshipService.list({ sort: 'publicacao', pageSize: 2 }), [])
  return (
    <section className="bg-white py-16 max-lg:py-12">
      <div className="wrap">
        <Eyebrow>Continua a explorar</Eyebrow>
        <h2 className="h-page text-[30px] leading-9 max-lg:text-[32px]">Acabaram de chegar</h2>
        <p className="mt-0.5 text-[15px] text-muted">
          <span className="max-lg:hidden">Publicações demonstrativas de 24 a 26 de outubro de 2026.</span>
          <span className="lg:hidden">Publicações ilustrativas · 24–26 de outubro de 2026</span>
        </p>
        <div className="mt-[30px] space-y-[26px]">
          {(data?.items ?? []).map((s) => {
            const open = callStatus(s.deadline) === 'aberta'
            return (
              <div key={s.id} className="card flex items-center gap-5 !shadow-none px-6 py-[24px] max-lg:hidden">
                <GraduationCap size={26} strokeWidth={1.5} className="text-green" aria-hidden />
                <div className="flex-1">
                  <h3 className="text-[19px] font-semibold leading-6">{s.title}</h3>
                  <p className="mt-[8px] text-[13px] text-muted">
                    {s.institution} · {s.country} · {levelLabel[s.level]} · Fonte ilustrativa
                  </p>
                </div>
                <span className={`dot-label ${open ? 'tone-green' : 'tone-red'}`}>{open ? 'Candidatura aberta' : 'Candidatura expirada'}</span>
                <Link to={`/bolsas/${s.slug}`} className="btn btn-sm" aria-label={`Ver detalhes de ${s.title} (${fundingLabel[s.funding]}, prazo ${formatDate(s.deadline)})`}>
                  Ver detalhes
                </Link>
              </div>
            )
          })}
          {(data?.items ?? []).map((s) => (
            <div key={`m-${s.id}`} className="lg:hidden">
              <ScholarshipCard s={s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Transparency() {
  const items = [
    { icon: Link2, t: 'Fontes identificadas', d: 'O edital oficial é a referência final.' },
    { icon: BadgeCheck, t: 'Verificação explicada', d: 'Um perfil pendente não é um perfil verificado.' },
    { icon: Lock, t: 'Dados mínimos', d: 'Sem documentos privados ou contactos expostos sem consentimento.' },
  ]
  return (
    <section className="bg-mist py-[72px] max-lg:hidden">
      <div className="wrap grid gap-[60px] lg:grid-cols-[1fr_440px]">
        <div>
          <Eyebrow>Informação com responsabilidade</Eyebrow>
          <h2 className="h-page text-[30px] leading-9">Transparência, sem atalhos nem promessas</h2>
          <p className="lead mt-[28px] max-w-[670px] text-[16.5px] leading-6">
            Identificamos a origem de cada oportunidade e distinguimos a verificação da plataforma do estado da candidatura. Nenhuma mentoria garante uma bolsa.
          </p>
          <Link to="/sobre-nos" className="btn mt-[22px]">
            Conhecer os nossos princípios
          </Link>
        </div>
        <ul className="space-y-[18px]">
          {items.map(({ icon: Icon, t, d }) => (
            <li key={t} className="flex gap-[14px]">
              <Icon size={24} strokeWidth={1.6} className="mt-[2px] shrink-0 text-green" aria-hidden />
              <div>
                <h3 className="text-[16px] font-semibold leading-6">{t}</h3>
                <p className="mt-[3px] text-[14px] leading-[21px] text-muted">{d}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function BecomeMentor() {
  return (
    <section className="bg-navy py-[56px] text-white max-lg:py-10">
      <div className="wrap flex flex-wrap items-center justify-between gap-6">
        <div>
          <Eyebrow light>Partilha o teu percurso</Eyebrow>
          <h2 className="display !text-white text-[34px] leading-[40px] max-lg:text-[30px]">A tua experiência pode orientar outro caminho.</h2>
          <p className="mt-[12px] max-w-[1040px] text-[16px] leading-6 text-[#c9d6dd]">
            Cria um perfil profissional, apresenta os teus serviços e define os teus preços. A verificação é independente de qualquer pagamento.
          </p>
        </div>
        <Link to="/registo?papel=mentor" className="btn btn-primary max-lg:w-full">
          Quero ser mentor
        </Link>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section className="bg-white py-[56px] max-lg:hidden">
      <div className="wrap">
        <div className="mb-[14px] flex items-center justify-between">
          <h2 className="h-page text-[30px] leading-9">Antes de começares</h2>
          <Link to="/perguntas-frequentes" className="btn">
            Todas as perguntas
          </Link>
        </div>
        <FaqItem q="É preciso pagar para procurar bolsas?" a="Não. A consulta de oportunidades é gratuita. As mentorias e os cursos podem ser pagos." />
        <FaqItem q="A candidatura é feita aqui?" a="Não. Consulta os detalhes e segue as instruções do site oficial da instituição." />
        <FaqItem q="Uma mentoria garante a atribuição de uma bolsa?" a="Não. As decisões pertencem às instituições e dependem dos critérios de cada edital." />
      </div>
    </section>
  )
}

export default function HomePage() {
  useDocumentTitle('Início')
  return (
    <>
      <Hero />
      <SearchBand />
      <Featured />
      <Steps />
      <Mentors />
      <Guide />
      <Latest />
      <Transparency />
      <BecomeMentor />
      <Faq />
    </>
  )
}
