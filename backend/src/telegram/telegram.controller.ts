import { Body, Controller, ForbiddenException, Get, Headers, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './telegram.types';
import { TelegramTestMessageDto } from './dto/telegram-test-message.dto';

type AuthenticatedRequest = { user: { userId: string } };

@Controller('telegram')
export class TelegramController {
  constructor(
    private telegram: TelegramService,
    private prisma: PrismaService,
    private outbox: OutboxService,
  ) {}

  @Post('webhook')
  async webhook(
    @Headers('x-telegram-bot-api-secret-token') secret: string | undefined,
    @Body() update: TelegramUpdate,
  ) {
    const expected = this.telegram.getWebhookSecretToken();
    if (!expected) throw new ForbiddenException('Telegram webhook secret token is required');
    if (secret !== expected) throw new ForbiddenException('Invalid Telegram webhook secret token');
    const updateId = typeof update?.update_id === 'number' ? update.update_id : null;
    const dedupeKey = updateId !== null ? `telegram:update:${updateId}` : null;
    await this.outbox.enqueue(
      'telegram.update',
      { update },
      dedupeKey ? { dedupeKey, maxAttempts: 30 } : { maxAttempts: 30 },
    );
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('link-token')
  async createLinkToken(@Request() req: AuthenticatedRequest) {
    if (!this.telegram.isEnabled()) {
      return { ok: false, error: 'TELEGRAM_DISABLED' };
    }

    const { url, expiresAt } = await this.telegram.createLinkToken(req.user.userId);
    return { ok: true, url, expiresAt };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('status')
  async status(@Request() req: AuthenticatedRequest) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { telegramChatId: true, telegramUserId: true },
    });
    return { enabled: this.telegram.isEnabled(), connected: Boolean(user?.telegramChatId), telegramChatId: user?.telegramChatId ?? null };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('disconnect')
  async disconnect(@Request() req: AuthenticatedRequest) {
    return this.telegram.disconnect(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('test')
  async testMessage(@Request() req: AuthenticatedRequest, @Body() body: TelegramTestMessageDto) {
    if (!this.telegram.isEnabled()) {
      return { ok: false, error: 'TELEGRAM_DISABLED' };
    }
    const user = await this.prisma.user.findUnique({ where: { id: req.user.userId }, select: { telegramChatId: true } });
    if (!user?.telegramChatId) {
      return { ok: false, error: 'NOT_CONNECTED' };
    }
    const text = typeof body.text === 'string' && body.text.trim().length > 0 ? body.text.trim() : 'Тестовое сообщение от SecRep.';
    const res = await this.telegram.sendMessage(user.telegramChatId, text);
    return res.ok ? { ok: true } : { ok: false, error: res.error, details: (res as any).details };
  }
}
