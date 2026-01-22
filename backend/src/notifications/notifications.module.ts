import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OutboxModule } from '../outbox/outbox.module';
import { TelegramModule } from '../telegram/telegram.module';
import { NotificationsController } from './notifications.controller';
import { NotificationSendHandler } from './notifications.outbox';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [PrismaModule, TelegramModule, OutboxModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsScheduler, NotificationSendHandler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
