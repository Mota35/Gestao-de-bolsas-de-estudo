import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SelectField, TextAreaField } from '../../components/ui/Field'
import { Notice } from '../../components/ui/Notice'
import { ErrorState, Loading } from '../../components/ui/States'
import { useAsync } from '../../hooks/useAsync'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { DashHead } from '../../layouts/DashboardLayout'
import { getErrorMessage } from '../../lib/errors'
import { mentorAreaService } from '../../services'

const periods = ['Novembro de 2026', 'Dezembro de 2026', 'Janeiro de 2027']

export default function MentorAvailabilityPage() {
  useDocumentTitle('Disponibilidade')
  const { data, loading, error, reload } = useAsync(() => mentorAreaService.overview(), [])
  const [period, setPeriod] = useState('')
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data) {
      setPeriod(data.availabilityPeriod)
      setText(data.schedule.join('\n'))
    }
  }, [data])

  if (loading) return <Loading />
  if (error || !data) return <ErrorState message={error ?? 'Não foi possível carregar a disponibilidade.'} onRetry={reload} />

  const save = async () => {
    const schedule = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    if (schedule.length === 0) {
      toast.error('Indica pelo menos um horário.')
      return
    }
    setSaving(true)
    try {
      await mentorAreaService.saveAvailability({ period, schedule })
      toast.success('Disponibilidade guardada.')
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DashHead eyebrow="Área profissional" title="A tua disponibilidade" subtitle="Define os períodos em que atendes. Os horários ficam sempre sujeitos a confirmação." />
      <div className="grid items-start gap-7 lg:grid-cols-[1fr_330px]">
        <section className="card p-6">
          <h2 className="display text-[24px] leading-8">Disponibilidade de atendimento</h2>
          <div className="mt-[22px] space-y-[20px]">
            <SelectField label="Período" value={period} onChange={setPeriod} options={periods.includes(period) || !period ? periods : [period, ...periods]} />
            <TextAreaField label="Horários" rows={5} value={text} onChange={(e) => setText(e.target.value)} hint="Um horário por linha. Indica o fuso horário (Angola, UTC+1)." />
          </div>
          <button type="button" className="btn btn-primary mt-[22px]" onClick={save} disabled={saving}>
            {saving ? 'A guardar…' : 'Guardar disponibilidade'}
          </button>
        </section>
        <Notice tone="info" title="Horários sujeitos a confirmação">
          Os estudantes devem confirmar o horário e as condições directamente contigo antes de pagar.
        </Notice>
      </div>
    </>
  )
}
