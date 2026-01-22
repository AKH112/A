import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { OutboxHandlers } from './outbox.handlers';
import { OutboxService } from './outbox.service';
import { OutboxWorker } from './outbox.worker';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [OutboxService, OutboxHandlers, OutboxWorker],
  exports: [OutboxService, OutboxHandlers],
})
export class OutboxModule {}
