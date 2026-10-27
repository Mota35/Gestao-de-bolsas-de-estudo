import type { ReactNode } from 'react'

export interface Column<T> {
  header: string
  width?: string
  render: (row: T) => ReactNode
}

/** "Tabela" em grelha, igual ao desenho: cabeçalho em maiúsculas e última coluna em verde. */
export function DataTable<T>({ columns, rows, rowKey, empty }: { columns: Array<Column<T>>; rows: T[]; rowKey: (r: T) => string; empty?: string }) {
  const template = columns.map((c) => c.width ?? '1fr').join(' ')
  return (
    <div className="card dtable">
      <div className="dtable-inner" role="table">
        <div className="drow head" style={{ gridTemplateColumns: template }} role="row">
          {columns.map((c) => (
            <div key={c.header} role="columnheader">
              {c.header}
            </div>
          ))}
        </div>
        {rows.length === 0 && <p className="small py-4">{empty ?? 'Sem registos.'}</p>}
        {rows.map((r) => (
          <div key={rowKey(r)} className="drow" style={{ gridTemplateColumns: template }} role="row">
            {columns.map((c) => (
              <div key={c.header} role="cell">
                {c.render(r)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
