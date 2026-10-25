import { z } from 'zod';
import { httpUrl, scholarshipFields } from '../../modules/scholarships/scholarships.validators.js';

/** Contrato normalizado de uma oportunidade recolhida de uma fonte externa. */
export const candidateSchema = scholarshipFields
  .extend({
    externalId: z.string().trim().min(1).max(200),
    sourceUrl: httpUrl.optional(),
  })
  .strip();

export type Candidate = z.infer<typeof candidateSchema>;

export class IntegrationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntegrationUnavailableError';
  }
}

export interface ScholarshipConnector {
  /** Identificador estável usado nas rotas (ex.: "inagbe"). */
  readonly key: string;
  readonly displayName: string;
  /** Domínio oficial da fonte; os URLs oficiais das bolsas importadas têm de pertencer-lhe. */
  readonly allowedDomains: readonly string[];
  readonly capabilities: { automaticImport: boolean; manualEntry: boolean };
  /** Há uma integração autorizada configurada? Sem ela, só existe introdução manual. */
  isConfigured(): boolean;
  /** Recolhe itens em bruto (não validados). Lança IntegrationUnavailableError se não houver integração. */
  fetchRaw(): Promise<unknown[]>;
}
