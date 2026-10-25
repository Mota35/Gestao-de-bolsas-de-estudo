import { IntegrationUnavailableError } from './types.js';

/**
 * Pedido HTTP JSON com limites: HTTPS obrigatório, timeout, tamanho máximo, sem redireccionamentos
 * e sem tentativa de contornar autenticação ou protecções do site de origem.
 */
export async function fetchJsonLimited(
  url: string,
  opts: { timeoutMs: number; maxBytes: number },
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw new IntegrationUnavailableError('A fonte tem de usar HTTPS.');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
  try {
    const res = await fetchImpl(u, {
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': 'KwanzaOportunidades/1.0 (+contacto do administrador)' },
      redirect: 'error',
      signal: ctrl.signal,
    });
    if (!res.ok) throw new IntegrationUnavailableError(`A fonte respondeu com HTTP ${res.status}.`);
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('json')) throw new IntegrationUnavailableError('Resposta da fonte não é JSON.');

    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > opts.maxBytes) throw new IntegrationUnavailableError('Resposta da fonte demasiado grande.');

    const reader = res.body?.getReader();
    if (!reader) throw new IntegrationUnavailableError('Resposta vazia.');
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > opts.maxBytes) {
        await reader.cancel();
        throw new IntegrationUnavailableError('Resposta da fonte demasiado grande.');
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (err) {
    if (err instanceof IntegrationUnavailableError) throw err;
    if ((err as Error).name === 'AbortError') throw new IntegrationUnavailableError('Tempo limite excedido ao contactar a fonte.');
    throw new IntegrationUnavailableError('Falha ao contactar a fonte.');
  } finally {
    clearTimeout(timer);
  }
}
