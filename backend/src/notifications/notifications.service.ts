import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, NotificationChannel, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { RemindPaymentDto } from './dto/remind-payment.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  formatTelegramMessage(type: NotificationType, studentName?: string | null) {
    if (type === NotificationType.PAYMENT_REMINDER) {
      return studentName
        ? `Напоминание об оплате от ученика: <b>${studentName}</b>.`
        : 'Напоминание об оплате.';
    }
    if (type === NotificationType.LESSON_REMINDER) {
      return studentName ? `Напоминание о занятии с учеником <b>${studentName}</b>.` : 'Напоминание о занятии.';
    }
    if (type === NotificationType.HOMEWORK_ASSIGNED) {
      return studentName ? `Назначено домашнее задание ученику <b>${studentName}</b>.` : 'Назначено домашнее задание.';
    }
    return 'Уведомление SecRep.';
  }

  async create(data: Prisma.NotificationCreateInput, prisma: Prisma.TransactionClient | PrismaService = this.prisma) {
    return prisma.notification.create({ data });
  }

  async assertStudentOwnership(userId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, userId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException();
  }

  async createPaymentReminder(userId: string, body: RemindPaymentDto) {
    if (body.studentId) {
      await this.assertStudentOwnership(userId, body.studentId);
    }
    return this.create({
      user: { connect: { id: userId } },
      student: body.studentId ? { connect: { id: body.studentId } } : undefined,
      type: NotificationType.PAYMENT_REMINDER,
      channel: body.channel ?? NotificationChannel.TELEGRAM,
      scheduledAt: new Date(),
    });
  }

  async findAll(userId: string, query?: ListNotificationsQueryDto) {
    const take = query?.take ?? 50;
    const items = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      cursor: query?.cursor ? { id: query.cursor } : undefined,
      skip: query?.cursor ? 1 : 0,
      take,
    });
    const nextCursor = items.length === take ? items[items.length - 1]?.id ?? null : null;
    return { items, nextCursor };
  }
}
