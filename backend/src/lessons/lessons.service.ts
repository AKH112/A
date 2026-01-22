import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, from: Date, to: Date) {
    return this.prisma.lesson.findMany({
      where: {
        userId,
        startTime: { gte: from },
        endTime: { lte: to },
      },
      include: { student: { select: { id: true, name: true } } },
    });
  }

  async create(
    userId: string,
    data: {
      type: 'LESSON' | 'PERSONAL';
      studentId?: string;
      startTime: Date;
      endTime: Date;
      duration: number;
      price?: number;
    },
  ) {
    const overlap = await this.prisma.lesson.findFirst({
      where: {
        userId,
        status: { not: 'CANCELED' },
        startTime: { lt: data.endTime },
        endTime: { gt: data.startTime },
      },
    });

    if (overlap) throw new ConflictException('Time slot is occupied');

    return this.prisma.lesson.create({
      data: {
        userId,
        type: data.type,
        studentId: data.studentId ?? null,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
        price: data.price ?? null,
        status: 'PLANNED',
        isPaid: false,
      },
      include: { student: true },
    });
  }

  async findOne(id: string, userId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, userId },
      include: { student: true },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');
    return lesson;
  }

  async complete(id: string, userId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, userId },
      include: { student: true },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.status === 'COMPLETED') return lesson;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.lesson.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });

      if (lesson.type === 'LESSON' && !lesson.isPaid && lesson.price && lesson.studentId) {
        await tx.student.update({
          where: { id: lesson.studentId },
          data: { balance: { decrement: lesson.price } },
        });

        await tx.notification.create({
          data: {
            userId,
            studentId: lesson.studentId,
            type: 'PAYMENT_REMINDER',
            channel: 'EMAIL',
            scheduledAt: new Date(),
          },
        });
      }

      return updated;
    });
  }

  async pay(id: string, userId: string, amount: number) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, userId },
      include: { student: true },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.isPaid) throw new ConflictException('Already paid');

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.lesson.update({
        where: { id },
        data: { isPaid: true },
      });

      if (lesson.studentId) {
        await tx.student.update({
          where: { id: lesson.studentId },
          data: { balance: { increment: amount } },
        });
      }

      return updated;
    });
  }

  async delete(id: string, userId: string) {
    return this.prisma.lesson.deleteMany({
      where: { id, userId },
    });
  }
}
