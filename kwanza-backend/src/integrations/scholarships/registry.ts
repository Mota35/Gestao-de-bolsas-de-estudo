import type { ScholarshipConnector } from './types.js';

export class ConnectorRegistry {
  private connectors = new Map<string, ScholarshipConnector>();

  constructor(connectors: ScholarshipConnector[] = []) {
    connectors.forEach((c) => this.register(c));
  }

  register(connector: ScholarshipConnector): void {
    this.connectors.set(connector.key, connector);
  }

  get(key: string): ScholarshipConnector | undefined {
    return this.connectors.get(key);
  }

  list(): ScholarshipConnector[] {
    return [...this.connectors.values()];
  }
}
