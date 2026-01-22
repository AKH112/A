import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramUpdate } from './telegram.types';
import * as crypto from 'crypto';

type TelegramSendMessageResponse =
  | { ok: true; result: any }
  | { ok: false; error_code: number; description?: string };

@Injectable()
export class TelegramService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  isEnabled() {
    return Boolean(this.getBotToken());
  }

  getBotUsername() {
    const v = this.config.get<string>('TELEGRAM_BOT_USERNAME');
    return typeof v === 'string' && v.trim().length > 0 ? v.trim().replace(/^@/, '') : null;
  }

  getWebhookSecretToken() {
    const v = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET_TOKEN');
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
  }

  private getBotToken() {
    const v = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
  }

  async createLinkToken(userId: string) {
    const token = crypto.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const username = this.getBotUsername();

    await this.prisma.telegramLinkToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return {
      token,
      expiresAt,
      url: username ? `https://t.me/${username}?start=${token}` : null,
    };
  }

  async disconnect(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: null, telegramUserId: null },
    });
    return { ok: true };
  }

  async sendMessage(chatId: string, text: string) {
    const token = this.getBotToken();
    if (!token) return { ok: false as const, error: 'TELEGRAM_DISABLED' as const };

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = (await res.json().catch(() => null)) as TelegramSendMessageResponse | null;
    if (!data || data.ok !== true) {
      return {
        ok: false as const,
        error: 'TELEGRAM_SEND_FAILED' as const,
        details: data ?? { ok: false, error_code: res.status },
      };
    }

    return { ok: true as const };
  }

  private async handleStartCommand(chatId: string, telegramUserId: string | null, payload: string | null) {
    if (!payload) {
      await this.sendMessage(
        chatId,
        'Чтобы подключить SecRep, откройте SecRep → Telegram-бот → «Активировать». Затем нажмите кнопку и вернитесь сюда.',
      );
      return;
    }

    const token = payload.trim();
    if (!token) return;

    const link = await this.prisma.telegramLinkToken.findUnique({ where: { token } });
    if (!link) {
      await this.sendMessage(chatId, 'Ссылка для подключения недействительна или устарела. Создайте новую в SecRep.');
      return;
    }

    if (link.usedAt) {
      await this.sendMessage(chatId, 'Эта ссылка уже использована. Если нужно переподключить — создайте новую в SecRep.');
      return;
    }

    if (link.expiresAt.getTime() < Date.now()) {
      await this.sendMessage(chatId, 'Ссылка для подключения истекла. Создайте новую в SecRep.');
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.telegramLinkToken.update({
        where: { token },
        data: { usedAt: new Date() },
      });
      await tx.user.update({
        where: { id: link.userId },
        data: { telegramChatId: chatId, telegramUserId },
      });
    });

    await this.sendMessage(chatId, 'Вы успешно подключились к SecRep. Теперь вы будете получать уведомления о событиях, оплате и ДЗ.');
  }

  async handleUpdate(update: TelegramUpdate) {
    const message = update?.message;
    if (!message) return { ok: true as const };

    const chatId = String(message.chat.id);
    const chatType = message.chat.type;
    const text = typeof message.text === 'string' ? message.text : '';

    if (chatType !== 'private') {
      return { ok: true as const };
    }

    const telegramUserId = message.from?.id ? String(message.from.id) : null;

    if (text.startsWith('/start')) {
      const payload = text.replace('/start', '').trim() || null;
      await this.handleStartCommand(chatId, telegramUserId, payload);
    } else if (text.startsWith('/help')) {
      await this.sendMessage(chatId, 'Команды: /start (подключение), /status (статус), /stop (отвязать).');
    } else if (text.startsWith('/status')) {
      const user = await this.prisma.user.findFirst({ where: { telegramChatId: chatId }, select: { email: true } });
      await this.sendMessage(chatId, user ? `Подключено к аккаунту: ${user.email}` : 'Аккаунт не подключен.');
    } else if (text.startsWith('/stop')) {
      await this.prisma.user.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null, telegramUserId: null } });
      await this.sendMessage(chatId, 'Ок. Аккаунт отвязан. Подключить снова: SecRep → Telegram-бот → «Активировать».');
    }

    return { ok: true as const };
  }
}
