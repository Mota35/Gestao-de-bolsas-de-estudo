import { useState } from 'react'
import { DataTable } from '../../components/ui/DataTable'
import { Dot, Notice } from '../../components/ui/Notice'
import { ErrorState, Loading } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'
import { env } from '../../lib/env'
import { adminService } from '../../services'

export default function AdminIntegrationsPage() {
  useDocumentTitle('Integrações de oportunidades')
  const list = useAsync(() => adminService.integrations(), [])
  const logs = useAsync(() => adminService.integrationLogs(), [])
  const [selected, setSelected] = useState('')

  if (list.loading || logs.loading) return <Loading />
  if (list.error || !list.data || logs.error || !logs.data) {
    return (
      <ErrorState
        message={list.error ?? logs.error ?? 'Não foi possível carregar as integrações.'}
        onRetry={() => {
          list.reload()
          logs.reload()
        }}
      />
    )
  }
  const current = list.data.find((i) => i.id === selected) ?? list.data.find((i) => i.origin === 'Fonte Aurora') ?? list.data[0]
  const demo = env.demoMode

  return (
    <>
      <DashHead eyebrow="Acesso restrito · Integrações" title="Integrações de oportunidades" subtitle="Origens externas de bolsas. Nada é publicado sem revisão editorial." />
      <Notice tone="warn" title={demo ? 'Integrações simuladas' : 'Revisão editorial obrigatória'}>
        {demo
          ? 'Nenhuma origem real está ligada. Não são feitos pedidos a serviços externos nem importadas bolsas.'
          : 'Conteúdo importado fica pendente até ser verificado por uma pessoa autorizada.'}
      </Notice>
      <div className="mt-[28px]">
        <DataTable
          rows={list.data}
          rowKey={(i) => i.id}
          columns={[
            { header: 'Origem', render: (i) => i.origin },
            { header: 'Tipo', render: (i) => i.type },
            {
              header: 'Última sincronização',
              render: (i) =>
                i.lastSync.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                )),
            },
            { header: 'Estado', render: (i) => i.state },
            {
              header: 'Acção',
              render: (i) => (
                <button type="button" className="hover:underline" onClick={() => setSelected(i.id)}>
                  {i.action}
                </button>
              ),
            },
          ]}
        />
      </div>
      {current && (
        <div className="mt-[28px] grid items-start gap-7 lg:grid-cols-2">
          <section className="card p-6 pb-[28px]">
            <h2 className="display text-[24px] leading-8">{current.origin}</h2>
            <Dot tone={current.state.startsWith('Erro') ? 'red' : 'gray'} className="mt-[18px]">
              {current.state}
            </Dot>
            <dl className="mt-[18px] space-y-[14px] text-[15px]">
              <div>
                <dt className="small">Tipo</dt>
                <dd>{current.type}</dd>
              </div>
              <div>
                <dt className="small">Última tentativa</dt>
                <dd>{current.lastSync.join(' · ')}</dd>
              </div>
            </dl>
            <p className="small mt-[18px] text-[13px]">Credenciais de integração nunca são guardadas nem mostradas no frontend; ficam no servidor.</p>
          </section>
          <section className="card p-6 pb-[28px]">
            <h2 className="display text-[24px] leading-8">Resumo da tentativa{demo ? ' simulada' : ''}</h2>
            <ul className="mt-[18px] space-y-[10px] text-[15px] text-muted">
              <li>Registos recebidos: 0</li>
              <li>Bolsas criadas: 0</li>
              <li>Bolsas por rever: 0</li>
            </ul>
            <p className="small mt-[18px] text-[13px]">{demo ? 'Sem alterações reais ao catálogo.' : 'Consulta os registos para detalhes.'}</p>
          </section>
        </div>
      )}
      <div className="mb-[28px] mt-[40px]">
        <h2 className="h-page text-[30px] leading-9">Registos resumidos{demo ? ' · demonstração' : ''}</h2>
      </div>
      <DataTable
        rows={logs.data}
        rowKey={(l) => `${l.when}-${l.origin}`}
        columns={[
          { header: 'Data', render: (l) => l.when },
          { header: 'Origem', render: (l) => l.origin },
          { header: 'Evento', render: (l) => l.event },
          { header: 'Resultado', render: (l) => l.result },
        ]}
      />
    </>
  )
}
