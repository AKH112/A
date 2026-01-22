import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxStatus } from '@prisma/client';
import * as os from 'os';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxHandlers } from './outbox.handlers';

type LockedOutboxEvent = {
  id: string;
  topic: string;
  payload: any;
  attempts: number;
  maxAttempts: number;
};

@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private instanceId: string;

  constructor(
    private prisma: PrismaService,
    private handlers: OutboxHandlers,
    private config: ConfigService,
  ) {
    this.instanceId = `${os.hostname()}-${process.pid}`;
  }

  onModuleInit() {
    const enabled = this.config.get<string>('OUTBOX_WORKER_ENABLED') ?? '1';
    if (enabled !== '1') return;

    this.timer = setInterval(() => {
      void this.tick();
    }, 500);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private backoffMs(attempts: number) {
    const base = 1000;
    const max = 60_000;
    const exp = Math.min(max, base * Math.pow(2, Math.max(0, attempts - 1)));
    const jitter = Math.floor(Math.random() * 250);
    return exp + jitter;
  }

  private async lockBatch(limit: number): Promise<LockedOutboxEvent[]> {
    const rows = await this.prisma.$queryRaw<LockedOutboxEvent[]>`
      WITH cte AS (
        SELECT "id"
        FROM "OutboxEvent"
        WHERE "status" = ${OutboxStatus.PENDING}::"OutboxStatus" AND "availableAt" <= now()
        ORDER BY "availableAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      UPDATE "OutboxEvent"
      SET "status" = ${OutboxStatus.PROCESSING}::"OutboxStatus", "lockedAt" = now(), "lockedBy" = ${this.instanceId}
      WHERE "id" IN (SELECT "id" FROM cte)
      RETURNING "id", "topic", "payload", "attempts", "maxAttempts";
    `;
    return rows ?? [];
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const batch = await this.lockBatch(10);
      if (batch.length === 0) return;

      for (const e of batch) {
        const handler = this.handlers.get(e.topic);
        if (!handler) {
          await this.prisma.outboxEvent.update({
            where: { id: e.id },
            data: { status: OutboxStatus.FAILED, lastError: `NO_HANDLER:${e.topic}` },
          });
          continue;
        }

        try {
          await handler.handle(e.payload);
          await this.prisma.outboxEvent.update({
            where: { id: e.id },
            data: { status: OutboxStatus.PROCESSED, processedAt: new Date(), lockedAt: null, lockedBy: null },
          });
        } catch (err) {
          const lastError = err instanceof Error ? err.message : String(err);
          const nextAttempts = e.attempts + 1;
          const shouldFail = nextAttempts >= e.maxAttempts;
          const nextAvailableAt = new Date(Date.now() + this.backoffMs(nextAttempts));
          await this.prisma.outboxEvent.update({
            where: { id: e.id },
            data: {
              attempts: nextAttempts,
              status: shouldFail ? OutboxStatus.FAILED : OutboxStatus.PENDING,
              availableAt: shouldFail ? new Date() : nextAvailableAt,
              lastError,
              lockedAt: null,
              lockedBy: null,
            },
          });
        }
      }
    } finally {
      this.running = false;
    }
  }
}
