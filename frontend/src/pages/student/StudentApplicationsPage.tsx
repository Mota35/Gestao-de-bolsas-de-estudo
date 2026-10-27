import { Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CheckList } from '../../components/ui/CheckList'
import { Dot, Notice } from '../../components/ui/Notice'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'

/**
 * A plataforma não tem acesso a envios nem a decisões das instituições. Por isso mostra,
 * com honestidade, que o acompanhamento não existe, em vez de inventar progressos.
 */
export default function StudentApplicationsPage() {
  useDocumentTitle('Candidaturas')
  return (
    <>
      <DashHead title="As tuas candidaturas" subtitle="Informação honesta sobre o que podes acompanhar nesta plataforma." />
      <section className="card px-6 py-[48px] text-center max-sm:py-8">
        <Send size={50} strokeWidth={1.3} className="mx-auto text-green" aria-hidden />
        <Dot tone="amber" className="mt-[20px] !text-[12px]">
          Ainda indisponível
        </Dot>
        <h2 className="display mt-[12px] text-[30px] leading-9 max-sm:text-[24px]">O acompanhamento ainda não está disponível</h2>
        <p className="lead mx-auto mt-[22px] max-w-[990px] text-[17px] leading-6">
          Não temos acesso aos envios, à análise ou às decisões das instituições. Por isso, não mostramos progresso de candidaturas nem resultados fictícios.
        </p>
        <div className="mt-[24px] flex flex-wrap justify-center gap-3">
          <Link to="/estudante/guardadas" className="btn btn-primary">
            Consultar bolsas guardadas
          </Link>
          <Link to="/bolsas" className="btn">
            Procurar bolsas
          </Link>
        </div>
      </section>

      <div className="mt-[28px] grid items-start gap-7 md:grid-cols-2">
        <section className="card p-6 pb-[28px]">
          <h2 className="display text-[22px] leading-8">Como acompanhar fora da Kwanza</h2>
          <CheckList
            className="mt-[22px]"
            items={[
              'Entra no portal oficial da instituição.',
              'Confirma a recepção e guarda o comprovativo.',
              'Consulta o email e os canais indicados no edital.',
              'Contacta a instituição sobre prazos e decisões.',
            ]}
          />
        </section>
        <section className="card p-6">
          <h2 className="display text-[22px] leading-8">Prepara o próximo passo</h2>
          <p className="mt-[18px] text-[14.5px] leading-[21px] text-muted">
            Podes explorar cursos e mentorias para organizar o teu plano. São serviços pagos, sem garantia de atribuição de bolsa.
          </p>
          <Link to="/cursos-e-mentorias" className="btn mt-[18px]">
            Ver cursos e mentorias
          </Link>
          <Notice tone="info" title="Não envies documentos aqui" className="mt-[16px]">
            A plataforma não recolhe documentos pessoais para candidaturas externas.
          </Notice>
        </section>
      </div>
    </>
  )
}
