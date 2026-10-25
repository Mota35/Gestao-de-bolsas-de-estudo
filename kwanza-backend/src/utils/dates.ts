/** Offset (ms) de um fuso horário IANA num dado instante. */
function tzOffsetMs(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = Object.fromEntries(dtf.formatToParts(at).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Converte data local (y,m,d,h,mi,s,ms) num fuso para o instante UTC correspondente. */
export function zonedTimeToUtc(
  y: number, m: number, d: number, h: number, mi: number, s: number, ms: number, timeZone: string,
): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi, s, ms);
  const first = guess - tzOffsetMs(timeZone, new Date(guess));
  const second = guess - tzOffsetMs(timeZone, new Date(first));
  return new Date(second);
}

/**
 * Interpreta um prazo. Se for apenas data (YYYY-MM-DD), significa o FIM desse dia (23:59:59.999)
 * no fuso indicado. Se tiver hora e offset/Z, é um instante absoluto.
 */
export function parseDeadline(value: string, timeZone: string): Date | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    const date = zonedTimeToUtc(Number(y), Number(m), Number(d), 23, 59, 59, 999, timeZone);
    // valida datas impossíveis (ex.: 2026-02-31)
    const check = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (check.getUTCMonth() !== Number(m) - 1) return null;
    return date;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(value) && /(Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

/** Início do dia (00:00:00.000) no fuso, para datas de abertura. */
export function parseOpenDate(value: string, timeZone: string): Date | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    const check = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (check.getUTCMonth() !== Number(m) - 1) return null;
    return zonedTimeToUtc(Number(y), Number(m), Number(d), 0, 0, 0, 0, timeZone);
  }
  return parseDeadline(value, timeZone);
}

/** Data local (no fuso) correspondente a um instante, como Date em UTC à meia-noite (formato de colunas @db.Date). */
export function localDateOf(instant: Date, timeZone: string): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
}

/** Converte 'YYYY-MM-DD' (ou ISO com offset) para Date UTC-meia-noite da data local. null se inválido. */
export function parseCalendarDate(value: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) {
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? d : null;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(value) && /(Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    const instant = new Date(value);
    return Number.isNaN(instant.getTime()) ? null : localDateOf(instant, timeZone);
  }
  return null;
}

export function formatCalendarDate(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}
