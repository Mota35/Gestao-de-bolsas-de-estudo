import { Bookmark, BookmarkCheck, Check, ExternalLink } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ScholarshipCard } from '../../components/ScholarshipCard'
import { Dot, Notice } from '../../components/ui/Notice'
import { Breadcrumb } from '../../components/ui/PageHeader'
import { ErrorState, Loading } from '../../components/ui/States'
import { useFavorites } from '../../contexts/FavoritesContext'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { env } from '../../lib/env'
import { callStatus, formatDate, fundingLabel, levelLabel, modalityLabel } from '../../lib/format'
import { scholarshipService } from '../../services'
import type { Scholarship } from '../../types'

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-[6px]">
      {items.map((i) => (
        <li key={i} className="flex items-start gap-[10px] text-[14.5px] leading-[21px]">
          <Check size={14} className="mt-[4px] shrink-0 text-ink" aria-hidden /> {i}
        </li>
      ))}
    </ul>
  )
}

function Others({ current }: { current: string }) {
  const { data } = useAsync(() => scholarshipService.list({ pageSize: 4 }), [current])
  const list = (data?.items ?? []).filter((s) => s.slug !== current).slice(0, 3)
  if (!list.length) return null
  return (
    <section className="mt-[56px]" aria-labelledby="outras">
      <h2 id="outras" className="h-page mb-[24px] text-[30px] leading-9">
        Outras possibilidades para explorar
      </h2>
      <div className="grid items-start gap-5 md:grid-cols-3">
        {list.map((s) => (
          <ScholarshipCard key={s.id} s={s} />
        ))}
      </div>
    </section>
  )
}

function Detail({ s }: { s: Scholarship }) {
  const { saved, toggle } = useFavorites()
  const open = callStatus(s.deadline) === 'aberta'
  const isSaved = saved.has(s.slug)
  const demo = env.demoMode && s.isDemo
  useDocumentTitle(s.title)
  return (
    <>
      <header className="bg-white">
        <div className="wrap pb-[40px] pt-[40px]">
          <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Bolsas', to: '/bolsas' }, { label: s.title }]} />
          <p className="mt-[19px] flex flex-wrap gap-3 text-[12px] font-semibold">
            <Dot tone={open ? 'green' : 'red'}>{open ? 'Candidatura aberta' : 'Candidatura expirada'}</Dot>
            <Dot tone="gray">{s.verification === 'verificada' ? `Verificada${demo ? ' · demonstração' : ''}` : 'Verificação pendente'}</Dot>
          </p>
          <h1 className="display mt-[17px] text-[44px] leading-[52px] max-sm:text-[34px] max-sm:leading-10">{s.title}</h1>
          <p className="mt-[22px] text-[20px] leading-7 text-muted">
            {s.institution} · {s.country} · {levelLabel[s.level]} · {modalityLabel[s.modality]}
          </p>
          <p className="mt-[24px] text-[12.5px] text-muted">
            Publicado em {formatDate(s.publishedAt)} · Actualizado em {formatDate(s.updatedAt)}
            {demo ? ' · Oportunidade fictícia' : ''}
          </p>
        </div>
      </header>

      <div className="bg-page pb-[64px] pt-9">
        <div className="wrap grid items-start gap-8 lg:grid-cols-[1fr_350px]">
          <div className="space-y-6">
            <Notice tone="success" title="Candidata-te apenas na fonte oficial">
              Não recolhemos documentos pessoais nem processamos candidaturas.{demo ? ' Os dados desta bolsa são ilustrativos.' : ''}
            </Notice>

            <section className="card p-6">
              <h2 className="text-[24px] font-bold leading-8">Sobre a oportunidade</h2>
              <p className="mt-[16px] text-[16px] leading-6 text-muted">{s.summary}</p>
              <h3 className="mb-[16px] mt-[22px] text-[20px] font-bold">Quem pode candidatar-se</h3>
              <CheckList items={s.eligibility ?? []} />
            </section>

            <section className="card p-6">
              <h2 className="text-[24px] font-bold leading-8">Benefícios e financiamento</h2>
              <Dot tone="green" className="mb-[18px] mt-[18px]">
                Financiamento {fundingLabel[s.funding].toLowerCase()}
                {demo ? ' · exemplo' : ''}
              </Dot>
              <CheckList items={s.benefits ?? []} />
              <p className="mt-[16px] text-[14px] text-muted">Viagens, seguros e despesas adicionais devem ser confirmados na fonte. Não assumes que estão cobertos.</p>
            </section>

            <section className="card p-6">
              <h2 className="text-[24px] font-bold leading-8">Documentos para a candidatura externa</h2>
              <p className="mb-[22px] mt-[14px] text-[14px] text-muted">Lista ilustrativa. Prepara e envia apenas pelos canais oficiais da instituição.</p>
              <CheckList items={s.documents ?? []} />
              <Notice tone="warn" title="Não envies documentos à Kwanza" className="mt-[22px]">
                Não há carregamento de passaporte, identificação, certificados ou dados bancários nesta plataforma.
              </Notice>
            </section>

            <section className="card p-6">
              <h2 className="text-[24px] font-bold leading-8">Como preparar a candidatura</h2>
              <ol className="mt-[18px] space-y-[18px]">
                {[
                  ['Ler o edital oficial', 'Confirma vagas, critérios, benefícios e todas as datas.'],
                  ['Preparar os documentos', 'Segue os formatos e requisitos da instituição.'],
                  ['Candidatar-te no site oficial', 'Guarda o comprovativo disponibilizado pela instituição.'],
                ].map(([t, d], i) => (
                  <li key={t}>
                    <div className="flex items-baseline gap-3">
                      <span className="dot-label !text-[12px] !font-bold">0{i + 1}</span>
                      <h3 className="text-[16px] font-bold">{t}</h3>
                    </div>
                    <p className="mt-[8px] pl-[36px] text-[14px] text-muted">{d}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-4">
            <section className="card p-6">
              <p className="text-[12px] uppercase tracking-[0.02em] text-muted">Prazo de candidatura</p>
              <p className={`mt-[22px] text-[28px] font-bold leading-8 ${open ? '' : 'text-danger'}`}>{formatDate(s.deadline)}</p>
              <ul className="mt-[22px] text-[14.5px] leading-[21px]">
                <li>País: {s.country}</li>
                <li>Nível: {levelLabel[s.level]}</li>
                <li>Área: {s.area}</li>
                <li>Modalidade: {modalityLabel[s.modality]}</li>
              </ul>
              <hr className="my-[18px] border-0 border-t border-line" />
              {s.officialUrl && open ? (
                <a href={s.officialUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-block">
                  <ExternalLink size={16} aria-hidden /> Consultar candidatura oficial
                </a>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={!open}
                  onClick={() => toast.info('Ainda não existe uma ligação oficial validada para esta oportunidade. Consulta o portal da instituição.')}
                >
                  <ExternalLink size={16} aria-hidden /> {open ? 'Consultar candidatura oficial' : 'Candidatura encerrada'}
                </button>
              )}
              <button type="button" className="btn btn-block mt-4" onClick={() => toggle(s.slug)} aria-pressed={isSaved}>
                {isSaved ? <BookmarkCheck size={16} aria-hidden /> : <Bookmark size={16} aria-hidden />} {isSaved ? 'Bolsa guardada' : 'Guardar bolsa'}
              </button>
              <p className="small mt-4">
                {demo ? 'Acções apenas visuais. Sem abertura de links ou candidatura neste design.' : 'A candidatura é feita sempre no site oficial da instituição.'}
              </p>
            </section>

            <section className="card p-6">
              <h2 className="text-[20px] font-bold leading-7">Fonte e verificação</h2>
              <p className="mt-[16px] text-[14.5px] leading-[21px]">
                {s.sourceName ?? `Portal oficial do ${s.institution}`}
                {demo ? ' · fonte de exemplo' : ''}
              </p>
              <p className="small mt-[14px]">
                {demo
                  ? `Consulta ilustrativa: ${formatDate(s.updatedAt)}. Não existe verificação real deste conteúdo fictício.`
                  : `Última actualização: ${formatDate(s.updatedAt)}.`}
              </p>
              <Dot tone="gray" className="mt-[18px]">
                {s.verification === 'verificada' ? `Verificada${demo ? ' · exemplo' : ''}` : 'Verificação pendente'}
              </Dot>
              <p className="small mt-[16px]">A verificação da fonte não garante admissão, financiamento nem atribuição da bolsa.</p>
              <Link to={`/contactos?categoria=Bolsas e fontes&assunto=${encodeURIComponent(`Informação sobre ${s.title}`)}`} className="btn btn-sm mt-[14px]">
                Reportar informação
              </Link>
            </section>
          </aside>
        </div>
        <div className="wrap">
          <Others current={s.slug} />
        </div>
      </div>
    </>
  )
}

export default function ScholarshipDetailPage() {
  const { slug = '' } = useParams()
  const { data, loading, error, reload } = useAsync(() => scholarshipService.get(slug), [slug])
  if (loading) return <Loading />
  if (error || !data)
    return (
      <div className="wrap py-16">
        <ErrorState message={error ?? 'Bolsa não encontrada.'} onRetry={reload} />
        <Link to="/bolsas" className="btn mt-6">
          Ver todas as bolsas
        </Link>
      </div>
    )
  return <Detail s={data} />
}
