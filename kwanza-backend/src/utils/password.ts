import argon2 from 'argon2';
import type { AppConfig } from '../config/index.js';

const COMMON_PASSWORDS = new Set([
  'password', 'password1', '123456789', '1234567890', 'qwertyuiop', 'iloveyou12',
  'senha12345', 'angola1234', 'luanda1234', 'admin12345', 'letmein123',
]);

export function passwordPolicyIssues(password: string, email?: string): string[] {
  const issues: string[] = [];
  if (password.length < 10) issues.push('A senha deve ter pelo menos 10 caracteres.');
  if (password.length > 128) issues.push('A senha deve ter no máximo 128 caracteres.');
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    issues.push('A senha deve conter letras e números.');
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) issues.push('A senha é demasiado comum.');
  if (email && password.toLowerCase().includes(email.split('@')[0]!.toLowerCase()) && email.split('@')[0]!.length >= 4) {
    issues.push('A senha não deve conter o seu email.');
  }
  return issues;
}

export class PasswordHasher {
  private dummyHash: Promise<string>;

  constructor(private readonly cfg: AppConfig['argon2']) {
    // Hash fictício para igualar o tempo de resposta quando o utilizador não existe.
    this.dummyHash = this.hash('dummy-password-for-timing-equalisation');
  }

  hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: this.cfg.memoryCost,
      timeCost: this.cfg.timeCost,
      parallelism: this.cfg.parallelism,
    });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /** Verificação contra um hash falso, para não revelar a existência da conta pelo tempo. */
  async verifyDummy(password: string): Promise<void> {
    await this.verify(await this.dummyHash, password);
  }
}
