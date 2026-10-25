import { createHash } from 'node:crypto';

export interface LoginThrottle {
  check(identifier: string): { locked: boolean; retryAfterSeconds: number };
  recordFailure(identifier: string): void;
  reset(identifier: string): void;
}

interface Entry {
  failures: number;
  lockedUntil: number;
  lastFailure: number;
}

/**
 * Bloqueio temporário de tentativas de login, por email (existente ou não, para não revelar contas).
 * Implementação em memória: válida para uma única instância. Para várias instâncias, implemente
 * a interface LoginThrottle sobre Redis (a interface é injectada no container).
 */
export class InMemoryLoginThrottle implements LoginThrottle {
  private entries = new Map<string, Entry>();

  constructor(
    private readonly maxFailures: number,
    private readonly lockMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  private key(identifier: string): string {
    return createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex');
  }

  check(identifier: string) {
    this.sweep();
    const entry = this.entries.get(this.key(identifier));
    const now = this.now();
    if (entry && entry.lockedUntil > now) {
      return { locked: true, retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
    }
    return { locked: false, retryAfterSeconds: 0 };
  }

  recordFailure(identifier: string): void {
    const k = this.key(identifier);
    const now = this.now();
    const entry = this.entries.get(k) ?? { failures: 0, lockedUntil: 0, lastFailure: now };
    // falhas antigas (fora da janela de bloqueio) deixam de contar
    if (now - entry.lastFailure > this.lockMs) entry.failures = 0;
    entry.failures += 1;
    entry.lastFailure = now;
    if (entry.failures >= this.maxFailures) {
      entry.lockedUntil = now + this.lockMs;
      entry.failures = 0;
    }
    this.entries.set(k, entry);
  }

  reset(identifier: string): void {
    this.entries.delete(this.key(identifier));
  }

  private sweep(): void {
    if (this.entries.size < 5000) return;
    const now = this.now();
    for (const [k, e] of this.entries) {
      if (e.lockedUntil < now && now - e.lastFailure > this.lockMs) this.entries.delete(k);
    }
  }
}
