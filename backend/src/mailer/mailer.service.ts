import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  fromName?: string;
};

type ResendConfig = {
  apiKey: string;
  from: string;
  fromName?: string;
};

@Injectable()
export class MailerService {
  private transport: nodemailer.Transporter | null = null;
  private cachedConfig: SmtpConfig | null = null;

  constructor(private config: ConfigService) {}

  private createTransport(cfg: SmtpConfig) {
    const requireTLS =
      cfg.port === 587 ||
      this.config.get<string>('SMTP_REQUIRE_TLS') === '1' ||
      this.config.get<string>('SMTP_REQUIRE_TLS') === 'true';

    return nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
      requireTLS: requireTLS ? true : undefined,
      tls: { servername: cfg.host },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  private readResendConfig(): ResendConfig | null {
    const apiKey = this.config.get<string>('RESEND_API_KEY')?.trim() ?? '';
    if (!apiKey) return null;
    const fromRaw = this.config.get<string>('RESEND_FROM')?.trim() ?? '';
    const fromName = this.config.get<string>('RESEND_FROM_NAME')?.trim() ?? '';
    const from = fromRaw || 'onboarding@resend.dev';
    return { apiKey, from, fromName: fromName || undefined };
  }

  private readSmtpConfig(): SmtpConfig | null {
    const env = this.config.get<string>('NODE_ENV') ?? 'development';
    const enableDevMailhog =
      this.config.get<string>('SMTP_DEV_MAILHOG') !== '0' && this.config.get<string>('SMTP_DEV_MAILHOG') !== 'false';

    const host = this.config.get<string>('SMTP_HOST')?.trim() ?? '';
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 0);
    if (!host || !port) {
      if (env !== 'production' && enableDevMailhog) {
        return {
          host: '127.0.0.1',
          port: 1025,
          secure: false,
          from: 'no-reply@secrep.local',
          fromName: 'SecRep',
        };
      }
      return null;
    }

    const secure =
      this.config.get<string>('SMTP_SECURE') === '1' ||
      this.config.get<string>('SMTP_SECURE') === 'true' ||
      port === 465;

    const user = this.config.get<string>('SMTP_USER')?.trim() ?? '';
    const pass = this.config.get<string>('SMTP_PASS') ?? '';
    if ((user && !pass) || (!user && pass)) return null;

    const fromRaw = this.config.get<string>('SMTP_FROM')?.trim() ?? '';
    const from = fromRaw || user;
    if (!from) return null;

    const fromName = this.config.get<string>('SMTP_FROM_NAME')?.trim() ?? '';

    return {
      host,
      port,
      secure,
      user: user || undefined,
      pass: pass || undefined,
      from,
      fromName: fromName || undefined,
    };
  }

  isConfigured() {
    return !!this.readResendConfig() || !!this.readSmtpConfig();
  }

  getPublicConfig() {
    const resend = this.readResendConfig();
    if (resend) {
      return {
        provider: 'resend',
        from: resend.fromName ? `${resend.fromName} <${resend.from}>` : resend.from,
      };
    }

    const cfg = this.readSmtpConfig();
    if (!cfg) return null;
    return {
      provider: 'smtp',
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      from: cfg.fromName ? `${cfg.fromName} <${cfg.from}>` : cfg.from,
      user: cfg.user ?? null,
    };
  }

  private getTransport() {
    const cfg = this.readSmtpConfig();
    if (!cfg) return null;

    const same =
      this.cachedConfig &&
      this.cachedConfig.host === cfg.host &&
      this.cachedConfig.port === cfg.port &&
      this.cachedConfig.secure === cfg.secure &&
      this.cachedConfig.user === cfg.user &&
      this.cachedConfig.pass === cfg.pass &&
      this.cachedConfig.from === cfg.from &&
      this.cachedConfig.fromName === cfg.fromName;

    if (this.transport && same) return this.transport;

    const transporter = this.createTransport(cfg);

    this.transport = transporter;
    this.cachedConfig = cfg;
    return transporter;
  }

  private async sendOtpViaResend(params: { to: string; code: string; expiresInMinutes: number }) {
    const cfg = this.readResendConfig();
    if (!cfg) throw new Error('RESEND is not configured');

    const from = cfg.fromName ? `${cfg.fromName} <${cfg.from}>` : cfg.from;
    const subject = `SecRep: одноразовый пароль ${params.code}`;

    const text = [
      `Ваш одноразовый пароль для входа в SecRep: ${params.code}`,
      '',
      `Код действителен ${params.expiresInMinutes} минут.`,
      'Если вы не запрашивали код, просто проигнорируйте это письмо.',
    ].join('\n');

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 12px;">SecRep</h2>
        <p style="margin: 0 0 12px;">Ваш одноразовый пароль для входа:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; background: #f3f4f6; padding: 14px 16px; border-radius: 12px; display: inline-block;">
          ${params.code}
        </div>
        <p style="margin: 12px 0 0; color: #6b7280;">Код действителен ${params.expiresInMinutes} минут.</p>
        <p style="margin: 12px 0 0; color: #6b7280;">Если вы не запрашивали код, просто проигнорируйте это письмо.</p>
      </div>
    `.trim();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject,
        text,
        html,
      }),
    });

    if (!res.ok) {
      let bodyText = '';
      try {
        bodyText = await res.text();
      } catch {
        bodyText = '';
      }
      throw new Error(`RESEND error: ${res.status} ${bodyText}`.trim());
    }
  }

  async sendOtpEmail(params: { to: string; code: string; expiresInMinutes: number }) {
    if (this.readResendConfig()) {
      await this.sendOtpViaResend(params);
      return;
    }

    const cfg = this.readSmtpConfig();
    const transport = this.getTransport();
    if (!cfg || !transport) throw new Error('SMTP is not configured');

    const subject = `SecRep: одноразовый пароль ${params.code}`;
    const from = cfg.fromName ? `${cfg.fromName} <${cfg.from}>` : cfg.from;

    const text = [
      `Ваш одноразовый пароль для входа в SecRep: ${params.code}`,
      '',
      `Код действителен ${params.expiresInMinutes} минут.`,
      'Если вы не запрашивали код, просто проигнорируйте это письмо.',
    ].join('\n');

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 12px;">SecRep</h2>
        <p style="margin: 0 0 12px;">Ваш одноразовый пароль для входа:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; background: #f3f4f6; padding: 14px 16px; border-radius: 12px; display: inline-block;">
          ${params.code}
        </div>
        <p style="margin: 12px 0 0; color: #6b7280;">Код действителен ${params.expiresInMinutes} минут.</p>
        <p style="margin: 12px 0 0; color: #6b7280;">Если вы не запрашивали код, просто проигнорируйте это письмо.</p>
      </div>
    `.trim();

    const send = async (t: nodemailer.Transporter) => {
      await t.sendMail({
        from,
        to: params.to,
        subject,
        text,
        html,
      });
    };

    try {
      await send(transport);
      return;
    } catch (err: unknown) {
      const code = typeof (err as any)?.code === 'string' ? (err as any).code : '';
      const timeoutish = code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ECONNECTION' || code === 'ECONNRESET';

      const isGmail = cfg.host.toLowerCase() === 'smtp.gmail.com';
      if (timeoutish && isGmail && cfg.port === 465) {
        const altCfg: SmtpConfig = { ...cfg, port: 587, secure: false };
        const alt = this.createTransport(altCfg);
        try {
          await send(alt);
          return;
        } catch {
          // fall through to dev mailhog fallback
        }
      }

      const env = this.config.get<string>('NODE_ENV') ?? 'development';
      const enableDevMailhog =
        this.config.get<string>('SMTP_DEV_MAILHOG') !== '0' && this.config.get<string>('SMTP_DEV_MAILHOG') !== 'false';
      if (timeoutish && env !== 'production' && enableDevMailhog) {
        const devCfg: SmtpConfig = {
          host: '127.0.0.1',
          port: 1025,
          secure: false,
          from: cfg.from,
          fromName: cfg.fromName,
        };
        const dev = this.createTransport(devCfg);
        await send(dev);
        return;
      }

      throw err;
    }
  }
}
