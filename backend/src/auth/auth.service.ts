import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import { RegisterDto } from './dto/register.dto';

const OTP_TTL_MS = 15 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 6;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
    private mailer: MailerService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.usersService.findOne(email);
    if (!user) return null;
    const ok = await bcrypt.compare(pass, user.passwordHash);
    if (!ok) return null;
    const { passwordHash, ...result } = user as any;
    return result;
  }

  async getSafeUserById(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) return null;
    const { passwordHash, ...safe } = user as any;
    return safe as { id: string; email: string; tariff: string };
  }

  private getJwtSecret() {
    const v = this.config.get<string>('JWT_SECRET');
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : '';
  }

  private getRefreshSecret() {
    const v = this.config.get<string>('JWT_REFRESH_SECRET');
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    return this.getJwtSecret();
  }

  createAccessToken(user: { id: string; email: string; tariff: string }) {
    const payload = { email: user.email, sub: user.id, tariff: user.tariff, type: 'access' };
    return this.jwtService.sign(payload, { expiresIn: '15m', secret: this.getJwtSecret() });
  }

  createRefreshToken(user: { id: string; email: string; tariff: string }) {
    const payload = { sub: user.id, type: 'refresh' };
    return this.jwtService.sign(payload, { expiresIn: '7d', secret: this.getRefreshSecret() });
  }

  verifyRefreshToken(token: string) {
    return this.jwtService.verify<{ sub: string; type?: string }>(token, { secret: this.getRefreshSecret() });
  }

  async register(data: RegisterDto) {
    const existing = await this.usersService.findOne(data.email);
    if (existing) throw new ConflictException('User already exists');
    const created = await this.usersService.create({
      email: data.email,
      password: data.password,
      name: data.name,
    });
    const { passwordHash, ...safe } = created as any;
    return safe as { id: string; email: string; tariff: string };
  }

  async loginWithPassword(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user as { id: string; email: string; tariff: string };
  }

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private generateOtpCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async requestEmailOtp(rawEmail: string) {
    const email = this.normalizeEmail(rawEmail);
    const now = new Date();

    const last = await this.prisma.emailOtpCode.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, consumedAt: true, expiresAt: true },
    });

    if (last && !last.consumedAt && last.expiresAt.getTime() > now.getTime()) {
      const delta = now.getTime() - last.createdAt.getTime();
      if (delta < OTP_RESEND_MS) {
        throw new HttpException('Resend cooldown', HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    await this.prisma.emailOtpCode.updateMany({
      where: { email, consumedAt: null, expiresAt: { gt: now } },
      data: { expiresAt: now },
    });

    const code = this.generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    const created = await this.prisma.emailOtpCode.create({
      data: { email, codeHash, expiresAt },
    });

    const debugEnabled = this.config.get<string>('OTP_DEBUG_RETURN_CODE') === '1';
    const env = this.config.get<string>('NODE_ENV') ?? 'development';
    const debugCode = env !== 'production' && debugEnabled ? code : undefined;

    const smtpConfigured = this.mailer.isConfigured();
    if (!smtpConfigured) {
      if (debugCode) {
        return {
          ok: true,
          resendAfterSec: Math.floor(OTP_RESEND_MS / 1000),
          expiresInSec: Math.floor(OTP_TTL_MS / 1000),
          debugCode,
        };
      }
      await this.prisma.emailOtpCode.update({ where: { id: created.id }, data: { expiresAt: new Date() } });
      throw new HttpException('Почта не настроена (SMTP_* или RESEND_API_KEY/RESEND_FROM).', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      await this.mailer.sendOtpEmail({ to: email, code, expiresInMinutes: Math.floor(OTP_TTL_MS / 60000) });
    } catch (err: unknown) {
      await this.prisma.emailOtpCode.update({ where: { id: created.id }, data: { expiresAt: new Date() } });
      const code = typeof (err as any)?.code === 'string' ? (err as any).code : undefined;
      const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
      const response = typeof (err as any)?.response === 'string' ? (err as any).response : undefined;
      const responseCode = typeof (err as any)?.responseCode === 'number' ? (err as any).responseCode : undefined;
      const smtp = this.mailer.getPublicConfig();
      const provider = typeof (smtp as any)?.provider === 'string' ? String((smtp as any).provider) : 'smtp';

      const isResendError = message.toUpperCase().startsWith('RESEND ERROR:') || message.toUpperCase().includes('RESEND ERROR:');
      const resendSnippet = isResendError
        ? message
            .slice(message.toUpperCase().indexOf('RESEND ERROR:') + 'RESEND ERROR:'.length)
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 240)
        : '';

      const hint =
        provider === 'resend' || isResendError
          ? `Resend: проверьте RESEND_API_KEY и RESEND_FROM. Если аккаунт в test mode — письма могут уходить только на ваш email в Resend.${resendSnippet ? ` Ответ Resend: ${resendSnippet}` : ''}`
          : code === 'EAUTH' || message.toLowerCase().includes('auth') || message.toLowerCase().includes('password')
            ? 'Gmail: используйте App Password (16 символов) без пробелов.'
            : code === 'ESOCKET' || code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ECONNRESET'
              ? 'Проверьте SMTP_HOST/SMTP_PORT и доступ к сети.'
              : 'Проверьте SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM.';

      console.error('OTP email send failed', { smtp, code, responseCode, message, response });

      const details = [
        provider ? `provider=${provider}` : null,
        provider === 'smtp' && (smtp as any)?.host && (smtp as any)?.port ? `server=${(smtp as any).host}:${(smtp as any).port}` : null,
        provider === 'smtp' ? ((smtp as any)?.secure ? 'secure=1' : 'secure=0') : null,
        provider === 'resend' && typeof (smtp as any)?.from === 'string' ? `from=${String((smtp as any).from)}` : null,
        code ? `code=${code}` : null,
        responseCode ? `smtp=${responseCode}` : null,
      ]
        .filter(Boolean)
        .join(', ');
      throw new HttpException(
        `Не удалось отправить письмо с кодом. ${details ? `(${details}) ` : ''}${hint}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      ok: true,
      resendAfterSec: Math.floor(OTP_RESEND_MS / 1000),
      expiresInSec: Math.floor(OTP_TTL_MS / 1000),
    };
  }

  async verifyEmailOtp(rawEmail: string, rawCode: string) {
    const email = this.normalizeEmail(rawEmail);
    const code = rawCode.trim();

    const record = await this.prisma.emailOtpCode.findFirst({
      where: { email, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) throw new UnauthorizedException('Invalid code');
    if (record.expiresAt.getTime() <= Date.now()) throw new BadRequestException('Code expired');
    if (record.attempts >= OTP_MAX_ATTEMPTS) throw new HttpException('Too many attempts', HttpStatus.TOO_MANY_REQUESTS);

    const ok = await bcrypt.compare(code, record.codeHash);
    if (!ok) {
      const nextAttempts = record.attempts + 1;
      await this.prisma.emailOtpCode.update({
        where: { id: record.id },
        data: {
          attempts: nextAttempts,
          expiresAt: nextAttempts >= OTP_MAX_ATTEMPTS ? new Date() : record.expiresAt,
        },
      });
      throw new UnauthorizedException('Invalid code');
    }

    await this.prisma.emailOtpCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    const existing = await this.usersService.findOne(email);
    if (existing) {
      const { passwordHash, ...safe } = existing as any;
      return safe as { id: string; email: string; tariff: string };
    }

    const randomPassword = crypto.randomBytes(18).toString('base64url');
    const created = await this.usersService.create({ email, password: randomPassword });
    const { passwordHash, ...safe } = created as any;
    return safe as { id: string; email: string; tariff: string };
  }
}
