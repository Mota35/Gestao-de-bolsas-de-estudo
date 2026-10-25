import type { AppConfig } from '../../config/index.js';
import { fetchJsonLimited } from './safeFetch.js';
import { IntegrationUnavailableError, type ScholarshipConnector } from './types.js';

/**
 * Conector do INAGBE (https://inagbe.gov.ao/).
 *
 * IMPORTANTE: não está documentada nem assumida nenhuma API pública do INAGBE, e este código
 * NÃO faz scraping do portal. Por omissão apenas a introdução manual (validada por um
 * administrador) está disponível.
 *
 * Se o INAGBE (ou um parceiro autorizado) fornecer formalmente um feed JSON, o operador define
 * INAGBE_AUTHORIZED_FEED_URL e o feed tem de seguir o contrato `candidateSchema`
 * (src/integrations/scholarships/types.ts), aceite como `[...]` ou `{ "items": [...] }`.
 * Se o formato real for diferente, escreve-se um mapeador em `fetchRaw` quando existir documentação.
 */
export class InagbeConnector implements ScholarshipConnector {
  readonly key = 'inagbe';
  readonly displayName = 'INAGBE - Instituto Nacional de Gestão de Bolsas de Estudo';
  readonly allowedDomains = ['inagbe.gov.ao'] as const;

  constructor(
    private readonly cfg: AppConfig['integrations'],
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  get capabilities() {
    return { automaticImport: this.isConfigured(), manualEntry: true };
  }

  isConfigured(): boolean {
    return Boolean(this.cfg.inagbeFeedUrl);
  }

  async fetchRaw(): Promise<unknown[]> {
    if (!this.cfg.inagbeFeedUrl) {
      throw new IntegrationUnavailableError(
        'Não existe integração automática autorizada configurada para o INAGBE. Use a introdução manual.',
      );
    }
    const json = await fetchJsonLimited(
      this.cfg.inagbeFeedUrl,
      { timeoutMs: this.cfg.timeoutMs, maxBytes: this.cfg.maxBytes },
      this.fetchImpl,
    );
    const items = Array.isArray(json) ? json : (json as { items?: unknown })?.items;
    if (!Array.isArray(items)) throw new IntegrationUnavailableError('Formato do feed inesperado.');
    return items;
  }
}
