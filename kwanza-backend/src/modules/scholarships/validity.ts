import type { ScholarshipValidity } from '../../types/enums.js';
import { localDateOf } from '../../utils/dates.js';

/** "Hoje" no fuso configurado, como data UTC-meia-noite (comparável com colunas @db.Date). */
export function todayIn(timeZone: string, now: Date = new Date()): Date {
  return localDateOf(now, timeZone);
}

/**
 * Validade calculada a partir das datas — nunca de um campo manual nem da acessibilidade do link.
 * O prazo é inclusivo: a bolsa está aberta durante todo o dia do prazo (no fuso configurado).
 * Sem prazo conhecido não afirmamos que está aberta (UNKNOWN).
 */
export function computeValidity(
  s: { openingDate: Date | null; applicationDeadline: Date | null },
  today: Date,
): ScholarshipValidity {
  if (s.openingDate && s.openingDate.getTime() > today.getTime()) return 'UPCOMING';
  if (s.applicationDeadline) {
    return s.applicationDeadline.getTime() < today.getTime() ? 'CLOSED' : 'OPEN';
  }
  return 'UNKNOWN';
}

export function daysRemaining(deadline: Date | null, today: Date): number | null {
  if (!deadline) return null;
  return Math.round((deadline.getTime() - today.getTime()) / 86_400_000);
}
