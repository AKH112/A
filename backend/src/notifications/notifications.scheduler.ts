import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { OutboxService } from '../outbox/outbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationSendHandler } from './notifications.outbox';

@Injectable()
export class NotificationsScheduler implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private prisma: PrismaService,
    private outbox: OutboxService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, 3000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const due = await this.prisma.notification.findMany({
        where: {
          status: NotificationStatus.PENDING,
          channel: NotificationChannel.TELEGRAM,
          scheduledAt: { lte: new Date() },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 50,
        select: { id: true },
      });

      for (const n of due) {
        await this.outbox.enqueue(NotificationSendHandler.topic, { notificationId: n.id }, { dedupeKey: `notification:send:${n.id}` });
      }
    } finally {
      this.running = false;
    }
  }
}
