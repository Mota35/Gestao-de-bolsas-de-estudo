import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Normaliza um número internacional para E.164 (ex.: +244923456789).
 * Devolve null se for inválido. Números sem prefixo internacional são rejeitados
 * (não assumimos país), excepto se defaultCountry for indicado.
 */
export function normalizePhone(input: string, defaultCountry?: 'AO'): string | null {
  const parsed = parsePhoneNumberFromString(input.trim(), defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number; // E.164
}

/** Dígitos para wa.me (sem '+'). */
export function toWaDigits(e164: string): string {
  return e164.replace(/^\+/, '');
}
