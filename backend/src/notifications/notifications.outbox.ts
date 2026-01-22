import { Injectable, OnModuleInit } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { OutboxHandlers } from '../outbox/outbox.handlers';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationSendHandler implements OnModuleInit {
  static topic = 'notification.send';

  constructor(
    private handlers: OutboxHandlers,
    private prisma: PrismaService,
    private telegram: TelegramService,
    private notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.handlers.register({
      topic: NotificationSendHandler.topic,
      handle: async (payload: any) => {
        const notificationId = typeof payload?.notificationId === 'string' ? payload.notificationId : null;
        if (!notificationId) return;

        const n = await this.prisma.notification.findUnique({
          where: { id: notificationId },
          include: {
            user: { select: { telegramChatId: true } },
            student: { select: { name: true } },
          },
        });

        if (!n) return;
        if (n.channel !== NotificationChannel.TELEGRAM) return;
        if (n.status !== NotificationStatus.PENDING) return;

        const chatId = n.user.telegramChatId;
        if (!chatId) {
          await this.prisma.notification.update({ where: { id: n.id }, data: { status: NotificationStatus.FAILED } });
          return;
        }

        if (!this.telegram.isEnabled()) {
          throw new Error('TELEGRAM_DISABLED');
        }

        const text = this.notifications.formatTelegramMessage(n.type, n.student?.name ?? null);
        const send = await this.telegram.sendMessage(chatId, text);
        if (!send.ok) {
          throw new Error(send.error);
        }

        await this.prisma.notification.update({
          where: { id: n.id },
          data: { status: NotificationStatus.SENT, sentAt: new Date() },
        });
      },
    });
  }
}

