import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScholarshipCard } from '../../components/ScholarshipCard'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SelectField } from '../../components/ui/Field'
import { Dot, Notice } from '../../components/ui/Notice'
import { EmptyState, ErrorState, Loading } from '../../components/ui/States'
import { useFavorites } from '../../contexts/FavoritesContext'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'
import { env } from '../../lib/env'
import { callStatus, formatDate } from '../../lib/format'
import { favoriteService } from '../../services'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function StudentSavedPage() {
  useDocumentTitle('Bolsas guardadas')
  const { saved, clearAll } = useFavorites()
  const { data, loading, error, reload } = useAsync(() => favoriteService.list(), [saved.size])
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('')
  const [confirm, setConfirm] = useState(false)

  const all = data ?? []
  const list = useMemo(() => all.filter((s) => (!q || norm(`${s.title} ${s.institution}`).includes(norm(q))) && (!estado || callStatus(s.deadline) === estado)), [all, q, estado])
  const expired = all.filter((s) => callStatus(s.deadline) === 'expirada')

  return (
    <>
      <DashHead
        title="As tuas bolsas guardadas"
        subtitle="Reúne as oportunidades que queres consultar com mais atenção."
        action={
          <Link to="/bolsas" className="btn">
            Explorar bolsas
          </Link>
        }
      />
      <div className="grid gap-5 sm:grid-cols-[1fr_280px]">
        <label className="field">
          <span className="field-label">Pesquisar nos guardados</span>
          <input className="field-control" type="search" placeholder="Nome ou instituição" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <SelectField
          label="Estado da candidatura"
          value={estado}
          onChange={setEstado}
          options={[
            { value: 'aberta', label: 'Abertas' },
            { value: 'expirada', label: 'Expiradas' },
          ]}
          placeholder="Todos os estados"
        />
      </div>

      {expired.length > 0 && (
        <Notice tone="warn" title="Um prazo terminou" className="mt-[30px]">
          {expired.length === 1
            ? `A bolsa ${expired[0].title} expirou em ${formatDate(expired[0].deadline)}. Continua guardada para consulta, mas não está aberta.`
            : `${expired.length} bolsas guardadas já expiraram. Continuam guardadas para consulta, mas não estão abertas.`}
        </Notice>
      )}

      <p className="mt-[24px] flex flex-wrap gap-x-[14px] gap-y-1">
        <Dot tone="gray">
          {all.length} guardada{all.length === 1 ? '' : 's'}
        </Dot>
        <Dot tone="green">
          {all.length - expired.length} aberta{all.length - expired.length === 1 ? '' : 's'}
        </Dot>
        <Dot tone="red">
          {expired.length} expirada{expired.length === 1 ? '' : 's'}
        </Dot>
      </p>

      <div className="mt-[24px]">
        {loading && <Loading />}
        {error && <ErrorState message={error} onRetry={reload} />}
        {!loading && !error && list.length === 0 && (
          <EmptyState
            title={all.length ? 'Nenhuma bolsa corresponde aos filtros' : 'Ainda não guardaste nenhuma bolsa'}
            actions={
              all.length ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setQ('')
                    setEstado('')
                  }}
                >
                  Limpar filtros
                </button>
              ) : (
                <Link to="/bolsas" className="btn btn-primary">
                  Explorar bolsas
                </Link>
              )
            }
          >
            Guarda oportunidades para as consultares mais tarde.
          </EmptyState>
        )}
        <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <ScholarshipCard key={s.id} s={s} />
          ))}
        </div>
      </div>

      <section className="card mt-[28px] p-6 pb-[28px]">
        <h2 className="display text-[24px] leading-8">Guardar não é candidatar-se</h2>
        <p className="mt-[24px] text-[16px] leading-6 text-muted">
          As candidaturas são feitas nos portais das instituições. Consulta a fonte oficial para confirmar prazos, documentos e requisitos actualizados.
        </p>
        <div className="mt-[20px] flex flex-wrap gap-3">
          <button type="button" className="btn" disabled={all.length === 0} onClick={() => setConfirm(true)}>
            Remover selecção dos guardados
          </button>
          <Link to="/perguntas-frequentes" className="btn">
            Consultar perguntas frequentes
          </Link>
        </div>
        {env.demoMode && <p className="small mt-[22px] text-[13px]">Lista pessoal fictícia, mantida apenas durante esta sessão de demonstração.</p>}
      </section>

      <ConfirmDialog
        open={confirm}
        title="Remover todas as bolsas guardadas?"
        confirmLabel="Remover"
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setConfirm(false)
          if (await clearAll()) reload()
        }}
      >
        Esta acção remove a lista de guardados. Podes voltar a guardar as bolsas a qualquer momento.
      </ConfirmDialog>
    </>
  )
}
