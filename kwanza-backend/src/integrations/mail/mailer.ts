import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';
import type { AppConfig } from '../../config/index.js';
import type { Logger } from 'pino';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** Mailer em memória, para testes. */
export class InMemoryMailer implements Mailer {
  public readonly sent: MailMessage[] = [];
  public failNext = false;
  async send(message: MailMessage): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('mail transport failure');
    }
    this.sent.push(message);
  }
  last(to?: string): MailMessage | undefined {
    const list = to ? this.sent.filter((m) => m.to === to) : this.sent;
    return list[list.length - 1];
  }
  clear(): void {
    this.sent.length = 0;
  }
}

/**
 * Transporte de desenvolvimento: grava cada email num ficheiro local.
 * Nada é escrito nos logs (os links contêm tokens).
 */
export class FileOutboxMailer implements Mailer {
  constructor(private readonly dir: string) {}
  async send(message: MailMessage): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const name = `${Date.now()}-${message.to.replace(/[^a-z0-9@._-]/gi, '_')}.json`;
    await writeFile(join(this.dir, name), JSON.stringify(message, null, 2), { mode: 0o600 });
  }
}

export class SmtpMailer implements Mailer {
  private transporter: Transporter;
  constructor(private readonly cfg: AppConfig['mail']) {
    this.transporter = nodemailer.createTransport({
      host: cfg.smtp.host,
      port: cfg.smtp.port,
      secure: cfg.smtp.secure,
      requireTLS: !cfg.smtp.secure,
      auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass } : undefined,
    });
  }
  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.cfg.from, ...message });
  }
}

export function createMailer(cfg: AppConfig['mail'], logger: Logger): Mailer {
  if (cfg.transport === 'smtp') return new SmtpMailer(cfg);
  const dir = cfg.outboxDir ?? '.dev-mail';
  logger.warn({ dir }, 'Transporte de email "outbox": emails gravados em ficheiros locais (apenas desenvolvimento).');
  return new FileOutboxMailer(dir);
}
