import { Check, CircleHelp, Compass, GraduationCap, Minus, Plus, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MentorCard } from '../../components/MentorCard'
import { ScholarshipCard } from '../../components/ScholarshipCard'
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
      <div className="wrap py-8 lg:w-full lg:max-w-none lg:px-0 lg:py-0">
        <div className="relative isolate overflow-hidden rounded-2xl bg-navy lg:min-h-[560px] lg:rounded-none">
          <img src="/img/edificio-isptec.jpg" alt="Edifício do ISPTEC em Luanda" className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#092333]/95 via-[#092333]/75 to-[#092333]/15" aria-hidden="true" />
          <div className="wrap flex min-h-[560px] items-center py-16 max-lg:min-h-0 max-lg:py-10">
            <div className="max-w-[650px]">
              <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#8ce0bd]">
                <span className="max-lg:hidden">De Angola para novas possibilidades</span>
                <span className="lg:hidden">De Angola para o mundo</span>
              </p>
              <h1 className="display mt-[20px] !text-white text-[56px] leading-[66px] max-lg:mt-4 max-lg:text-[40px] max-lg:leading-[44px]">O teu próximo passo começa com uma oportunidade.</h1>
              <p className="lead mt-[30px] max-w-[560px] !text-white/85 text-[18px] leading-[27px] max-lg:mt-6">
                Descobre bolsas de estudo e encontra mentores para preparar o teu caminho, com informação clara e fontes à vista.
              </p>
              <div className="mt-[34px] flex flex-wrap gap-3 max-lg:flex-col">
                <Link to="/bolsas" className="btn btn-primary">
                  <Search size={18} aria-hidden /> Encontrar uma bolsa
                </Link>
                <Link to="/mentores" className="btn border-white/50 !bg-white/10 !text-white hover:!bg-white/20">
                  Conhecer mentores
                </Link>
              </div>
              <p className="small mt-[24px] !text-white/75 max-lg:hidden">Explorar é gratuito. As mentorias têm preços definidos por cada mentor.</p>
              <p className="small mt-6 !text-white/75 lg:hidden">Explorar é gratuito. Mentorias podem ser pagas.</p>
            </div>
          </div>
          <p className="absolute bottom-7 right-[max(24px,calc((100vw-1232px)/2))] flex items-center gap-3 text-[14px] text-white/90 max-lg:hidden">
            <Compass size={20} strokeWidth={1.6} className="text-[#8ce0bd]" aria-hidden /> Talento angolano. Horizontes sem fronteiras.
          </p>
        </div>
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
            Guia do estudante
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

const homeFaqTopics = [
  { id: 'externa', label: 'Bolsa Externa', items: [
    { q: 'Onde encontro bolsas de estudo no estrangeiro?', a: 'Explora as oportunidades disponíveis e confirma sempre os requisitos e prazos no edital e no portal oficial da instituição.' },
    { q: 'Onde faço a candidatura para uma bolsa externa?', a: 'A candidatura é feita no canal oficial indicado pela instituição. A Kwanza não recebe documentos nem submete candidaturas.' },
  ] },
  { id: 'interna', label: 'Bolsa Interna', items: [
    { q: 'Como encontro bolsas para estudar em Angola?', a: 'Pesquisa as oportunidades por país e nível de ensino. Confirma as condições actualizadas directamente na fonte oficial.' },
    { q: 'A Kwanza atribui ou garante uma bolsa interna?', a: 'Não. A atribuição cabe à instituição responsável e depende dos critérios e do processo definidos no edital.' },
  ] },
  { id: 'candidatura', label: 'Candidatura', items: [
    { q: 'Que documentos devo preparar?', a: 'Consulta a lista de documentos e os formatos exigidos no edital oficial. Envia-os apenas pelos canais da instituição.' },
    { q: 'Posso candidatar-me depois do prazo?', a: 'Um prazo expirado não indica uma candidatura aberta. Confirma com a instituição se existe uma nova edição.' },
  ] },
  { id: 'pagamento', label: 'Pagamento', items: [
    { q: 'Procurar bolsas na plataforma tem algum custo?', a: 'Não. A pesquisa de bolsas é gratuita. Cursos e mentorias podem ter preços definidos pelos respectivos profissionais.' },
    { q: 'Pagar uma mentoria garante a obtenção de uma bolsa?', a: 'Não. Nenhuma mentoria garante uma bolsa; a decisão é da instituição responsável.' },
  ] },
  { id: 'renovacao', label: 'Renovação', items: [
    { q: 'Como posso renovar uma bolsa?', a: 'As regras de renovação variam. Consulta o edital, o contrato ou os serviços oficiais da instituição que atribuiu a bolsa.' },
    { q: 'A plataforma trata da renovação da minha bolsa?', a: 'Não. A renovação deve ser pedida directamente à instituição, de acordo com as condições oficiais.' },
  ] },
]

function HomeFaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="rounded-xl border border-line bg-white px-5 sm:px-6">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex min-h-[82px] w-full items-center gap-4 text-left">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-white"><CircleHelp size={23} aria-hidden /></span>
        <span className="flex-1 text-[17px] font-semibold leading-6 text-ink">{q}</span>
        {open ? <Minus size={20} className="shrink-0 text-ink" aria-hidden /> : <Plus size={20} className="shrink-0 text-ink" aria-hidden />}
      </button>
      {open && <p className="pb-5 pl-14 pr-8 text-[14px] leading-6 text-muted">{a}</p>}
    </article>
  )
}

function Faq() {
  const [topicId, setTopicId] = useState(homeFaqTopics[0].id)
  const topic = homeFaqTopics.find((item) => item.id === topicId) ?? homeFaqTopics[0]
  return (
    <section className="bg-white py-[64px] max-lg:py-12">
      <div className="wrap">
        <header className="text-center">
          <h2 className="display text-[42px] leading-tight max-sm:text-[32px]">Perguntas frequentes</h2>
          <p className="mx-auto mt-3 max-w-[900px] text-[17px] leading-7 text-muted max-sm:text-[15px]">Estas são algumas das perguntas mais comuns sobre bolsas e candidaturas. Não encontraste o que procuras? Fala com a nossa equipa.</p>
        </header>
        <div className="mx-auto mt-10 flex max-w-[940px] flex-wrap justify-center gap-3" role="tablist" aria-label="Temas de perguntas frequentes">
          {homeFaqTopics.map((item) => (
            <button key={item.id} id={`faq-tab-${item.id}`} type="button" role="tab" aria-selected={topicId === item.id} aria-controls="faq-topic-panel" onClick={() => setTopicId(item.id)} className={`min-h-[54px] rounded-full border px-7 text-[15px] font-semibold transition-colors ${topicId === item.id ? 'border-navy bg-navy text-white' : 'border-line bg-white text-ink hover:border-navy'}`}>
              {item.label}
            </button>
          ))}
        </div>
        <div id="faq-topic-panel" role="tabpanel" aria-labelledby={`faq-tab-${topic.id}`} className="mx-auto mt-10 max-w-[1080px] space-y-4">
          {topic.items.map((item) => <HomeFaqRow key={item.q} q={item.q} a={item.a} />)}
        </div>
        <div className="mt-12 text-center">
          <Link to="/perguntas-frequentes" className="btn btn-primary min-h-[58px] rounded-none px-10 text-[16px]">Ver todas as perguntas</Link>
        </div>
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
      <Mentors />
      <Guide />
      <Latest />
      <BecomeMentor />
      <Faq />
    </>
  )
}
