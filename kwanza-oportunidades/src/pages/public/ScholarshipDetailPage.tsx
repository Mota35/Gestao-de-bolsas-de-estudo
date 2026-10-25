import { Link, useParams } from 'react-router-dom'
import { ExternalLink, Heart } from 'lucide-react'
import { scholarshipService } from '../../services/scholarships'
import { useAsync } from '../../hooks/useAsync'
import { useAuth } from '../../contexts/AuthContext'
import { useFavorites } from '../../contexts/FavoritesContext'
import { StatusBadge, VerificationBadge } from '../../components/ScholarshipCard'
import { DemoBadge, ErrorState, Spinner } from '../../components/ui'
import { effectiveStatus, formatDate, fundingLabels, levelLabels, modalityLabels } from '../../utils/format'

export default function ScholarshipDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { isFavorite, toggle } = useFavorites()
  const { data: s, loading, error, reload } = useAsync(() => scholarshipService.get(id), [id])

  if (loading) return <Spinner />
  if (error || !s) return <ErrorState message={error ?? 'Bolsa não encontrada.'} onRetry={reload} />

  const expired = effectiveStatus(s) === 'expired'
  const fav = isFavorite(s.id)

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <Link to="/bolsas" className="text-sm text-brand-600 hover:underline">← Voltar às bolsas</Link>
      <div className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          <VerificationBadge v={s.verification} />
          <StatusBadge s={s} />
          {s.isDemo && <DemoBadge />}
        </div>
        <h1 className="text-2xl font-bold text-brand-700">{s.title}</h1>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Item k="Instituição" v={s.institution} />
          <Item k="País" v={s.country} />
          <Item k="Nível" v={levelLabels[s.level]} />
          <Item k="Área de estudo" v={s.field} />
          <Item k="Financiamento" v={fundingLabels[s.funding]} />
          <Item k="Modalidade" v={modalityLabels[s.modality]} />
          <Item k="Prazo de candidatura" v={formatDate(s.deadline)} />
          <Item k="Publicada em" v={formatDate(s.publishedAt)} />
          <Item k="Fonte da informação" v={s.sourceName} />
        </dl>
        {s.verification !== 'verified' && (
          <p role="note" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Esta oportunidade ainda não foi verificada pela nossa equipa. Confirme os dados na fonte oficial antes de se candidatar.
          </p>
        )}
        {expired && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            O prazo desta bolsa terminou. As candidaturas já não estão abertas.
          </p>
        )}
        <section>
          <h2 className="mb-1 font-semibold text-slate-900">Descrição</h2>
          <p className="whitespace-pre-line text-slate-700">{s.description}</p>
        </section>
        {s.requirements && s.requirements.length > 0 && (
          <section>
            <h2 className="mb-1 font-semibold text-slate-900">Requisitos</h2>
            <ul className="list-disc space-y-1 pl-5 text-slate-700">{s.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
          </section>
        )}
        <div className="flex flex-wrap gap-3 pt-2">
          {s.applicationUrl && !expired && (
            <a href={s.applicationUrl} target="_blank" rel="noopener noreferrer" className="btn-accent">
              <ExternalLink className="h-4 w-4" aria-hidden /> Ir para a candidatura oficial
            </a>
          )}
          {s.sourceUrl && (
            <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">Ver fonte</a>
          )}
          {user ? (
            <button type="button" className="btn-outline" aria-pressed={fav} onClick={() => void toggle(s.id)}>
              <Heart className={`h-4 w-4 ${fav ? 'fill-red-500 text-red-500' : ''}`} aria-hidden />
              {fav ? 'Guardada' : 'Guardar nos favoritos'}
            </button>
          ) : (
            <Link to="/entrar" state={{ from: `/bolsas/${s.id}` }} className="btn-outline">Entre para guardar</Link>
          )}
        </div>
      </div>
    </article>
  )
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-medium text-slate-900">{v}</dd>
    </div>
  )
}
