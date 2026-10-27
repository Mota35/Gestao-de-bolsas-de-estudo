import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { FaqItem } from '../../components/ui/Faq'
import { Notice } from '../../components/ui/Notice'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/States'
import { faqTopics } from '../../data/faq'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function FaqPage() {
  useDocumentTitle('Perguntas frequentes')
  const [draft, setDraft] = useState('')
  const [term, setTerm] = useState('')
  const topics = useMemo(() => {
    const t = norm(term.trim())
    if (!t) return faqTopics
    return faqTopics.map((g) => ({ ...g, items: g.items.filter((i) => norm(`${i.q} ${i.a}`).includes(t)) })).filter((g) => g.items.length)
  }, [term])
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTerm(draft)
  }
  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Início', to: '/' }, { label: 'Perguntas frequentes', to: '/perguntas-frequentes' }, { label: 'Respostas claras para seguir em frente' }]}
        title="Respostas claras para seguir em frente"
        subtitle="O essencial sobre bolsas, fontes, mentorias, segurança e a tua conta."
      />
      <div className="bg-page pb-[40px] pt-[40px]">
        <div className="wrap">
          <form onSubmit={submit} role="search" className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
            <label className="field min-w-0 flex-1">
              <span className="field-label">Procurar uma pergunta</span>
              <input
                className="field-control"
                type="search"
                placeholder="Ex.: recuperar senha, prazo, verificação"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  if (!e.target.value) setTerm('')
                }}
              />
            </label>
            <button type="submit" className="btn btn-primary max-sm:w-full">
              Pesquisar
            </button>
          </form>

          <div className="mt-[32px] grid items-start gap-10 lg:grid-cols-[260px_1fr]">
            <aside className="card p-6 max-lg:hidden">
              <h2 className="display text-[20px] leading-7">Temas</h2>
              <nav aria-label="Temas" className="mt-[16px] space-y-[12px] text-[14px] text-green">
                {faqTopics.map((g) => (
                  <a key={g.id} href={`#${g.id}`} className="block hover:underline">
                    {g.title}
                  </a>
                ))}
              </nav>
              <hr className="my-[22px] border-0 border-t border-line" />
              <p className="text-[13px] text-muted">Não encontraste a resposta?</p>
              <Link to="/contactos" className="btn btn-block mt-[16px]">
                Contactar suporte
              </Link>
            </aside>

            <div className="space-y-[32px]">
              {topics.length === 0 && (
                <EmptyState
                  title="Sem resultados para esta pesquisa"
                  actions={
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setDraft('')
                        setTerm('')
                      }}
                    >
                      Limpar pesquisa
                    </button>
                  }
                >
                  Experimenta outro termo ou consulta todos os temas.
                </EmptyState>
              )}
              {topics.map((g) => (
                <section key={g.id} id={g.id} className="card scroll-mt-6 px-6 pb-6 pt-6" aria-labelledby={`t-${g.id}`}>
                  <h2 id={`t-${g.id}`} className="display text-[24px] leading-8">
                    {g.title}
                  </h2>
                  <div className="mt-[10px]">
                    {g.items.map((i) => (
                      <FaqItem key={i.q} q={i.q} a={i.a} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <Notice tone="info" title="A fonte oficial é a referência final" className="mt-[32px]">
            Em caso de diferença entre a plataforma e o edital, confirma os dados directamente com a instituição responsável.
          </Notice>
        </div>
      </div>
    </>
  )
}
