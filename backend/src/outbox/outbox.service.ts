import { Injectable } from '@nestjs/common';
import { Prisma, OutboxStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OutboxService {
  constructor(private prisma: PrismaService) {}

  async enqueue(
    topic: string,
    payload: Prisma.InputJsonValue,
    opts?: { dedupeKey?: string; availableAt?: Date; maxAttempts?: number },
  ) {
    const dedupeKey = opts?.dedupeKey;
    const availableAt = opts?.availableAt ?? new Date();
    const maxAttempts = opts?.maxAttempts ?? 8;

    try {
      return await this.prisma.outboxEvent.create({
        data: {
          topic,
          payload,
          dedupeKey: dedupeKey ?? null,
          availableAt,
          maxAttempts,
          status: OutboxStatus.PENDING,
        },
      });
    } catch (err) {
      if (dedupeKey) {
        const e = err as any;
        if (e?.code === 'P2002') {
          const existing = await this.prisma.outboxEvent.findUnique({ where: { dedupeKey } });
          if (existing) return existing;
        }
      }
      throw err;
    }
  }
}
