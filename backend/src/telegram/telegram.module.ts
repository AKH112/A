import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OutboxModule } from '../outbox/outbox.module';
import { TelegramController } from './telegram.controller';
import { TelegramUpdateHandler } from './telegram.outbox';
import { TelegramService } from './telegram.service';

@Module({
  imports: [PrismaModule, OutboxModule],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramUpdateHandler],
  exports: [TelegramService],
})
export class TelegramModule {}
