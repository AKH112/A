import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BalanceEventType, HomeworkStatus, SubscriptionStatus, TransactionType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CreateStudentPaymentDto } from './dto/create-student-payment.dto';
import { StudentsRangeQueryDto } from './dto/students-range-query.dto';
import { StudentsHomeworkQueryDto } from './dto/students-homework-query.dto';
import { CreateStudentSubscriptionDto } from './dto/create-student-subscription.dto';
import { CreateHomeworkTemplateDto } from './dto/create-homework-template.dto';
import { CreateHomeworkTaskDto } from './dto/create-homework-task.dto';
import { UpdateHomeworkTaskDto } from './dto/update-homework-task.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  private parseAmount(value: unknown) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Invalid amount');
    return Math.round(amount);
  }

  private parseDate(value: unknown) {
    if (!value) return new Date();
    const d = new Date(value as any);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
    return d;
  }

  async findAll(userId: string) {
    return this.prisma.student.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    return this.prisma.student.findFirst({
      where: { id, userId },
    });
  }

  async create(userId: string, data: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        name: data.name.trim(),
        contact: typeof data.contact === 'string' ? data.contact.trim() : null,
        notes: typeof data.notes === 'string' ? data.notes.trim() : null,
        user: { connect: { id: userId } },
      },
    });
  }

  async update(userId: string, studentId: string, patch: UpdateStudentDto) {
    const existing = await this.prisma.student.findFirst({ where: { id: studentId, userId } });
    if (!existing) throw new NotFoundException();

    const data: any = {};
    if (typeof patch.name === 'string') data.name = patch.name.trim();
    if (typeof patch.contact === 'string') data.contact = patch.contact.trim() || null;
    if (typeof patch.notes === 'string') data.notes = patch.notes.trim() || null;
    if (typeof patch.rateAmount === 'number') data.rateAmount = patch.rateAmount <= 0 ? null : this.parseAmount(patch.rateAmount);
    if (typeof patch.rateMinutes === 'number') data.rateMinutes = Math.round(Number(patch.rateMinutes));

    return this.prisma.student.update({ where: { id: studentId }, data });
  }

  async listBalanceEvents(userId: string, studentId: string, q: StudentsRangeQueryDto) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, userId } });
    if (!student) throw new NotFoundException();

    const where: any = { userId, studentId };
    if (q.from || q.to) {
      where.happenedAt = {};
      if (q.from) where.happenedAt.gte = q.from;
      if (q.to) where.happenedAt.lte = q.to;
    }

    return this.prisma.studentBalanceEvent.findMany({
      where,
      orderBy: { happenedAt: 'desc' },
    });
  }

  async deleteBalanceEvent(userId: string, studentId: string, eventId: string) {
    const event = await this.prisma.studentBalanceEvent.findFirst({ where: { id: eventId, userId, studentId } });
    if (!event) throw new NotFoundException();
    await this.prisma.studentBalanceEvent.delete({ where: { id: eventId } });
    return { ok: true };
  }

  async createPayment(userId: string, studentId: string, dto: CreateStudentPaymentDto) {
    const walletId = dto.walletId.trim();
    const amount = this.parseAmount(dto.amount);
    const happenedAt = this.parseDate(dto.happenedAt);
    const note = typeof dto.note === 'string' ? dto.note.trim() : null;

    const [student, wallet] = await Promise.all([
      this.prisma.student.findFirst({ where: { id: studentId, userId } }),
      this.prisma.wallet.findFirst({ where: { id: walletId, userId, isArchived: false } }),
    ]);
    if (!student) throw new NotFoundException('Student not found');
    if (!wallet) throw new NotFoundException('Wallet not found');

    return this.prisma.$transaction(async (tx) => {
      const comment = note ? `Оплата от ученика: ${student.name}. ${note}` : `Оплата от ученика: ${student.name}`;
      await tx.transaction.create({
        data: {
          id: randomUUID(),
          walletId,
          type: TransactionType.INCOME,
          amount,
          date: happenedAt,
          comment,
        },
      });

      await tx.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } });
      const updatedStudent = await tx.student.update({ where: { id: studentId }, data: { balance: { increment: amount } } });
      const event = await tx.studentBalanceEvent.create({
        data: {
          userId,
          studentId,
          walletId,
          type: BalanceEventType.TOP_UP,
          amount,
          note,
          happenedAt,
        },
      });

      return { event, student: updatedStudent };
    });
  }

  async listSubscriptions(userId: string, studentId: string, includeFinished: boolean) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, userId } });
    if (!student) throw new NotFoundException();
    return this.prisma.studentSubscription.findMany({
      where: {
        userId,
        studentId,
        ...(includeFinished ? {} : { status: SubscriptionStatus.ACTIVE }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSubscription(userId: string, studentId: string, dto: CreateStudentSubscriptionDto) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, userId } });
    if (!student) throw new NotFoundException();

    const lessonsTotal = Math.round(Number(dto.lessonsTotal));
    if (!Number.isFinite(lessonsTotal) || lessonsTotal <= 0) throw new BadRequestException('Invalid lessonsTotal');
    const price = typeof dto.price === 'number' ? this.parseAmount(dto.price) : null;

    return this.prisma.studentSubscription.create({
      data: {
        userId,
        studentId,
        title: dto.title.trim(),
        lessonsTotal,
        lessonsLeft: lessonsTotal,
        price,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  async finishSubscription(userId: string, studentId: string, subscriptionId: string) {
    const sub = await this.prisma.studentSubscription.findFirst({ where: { id: subscriptionId, userId, studentId } });
    if (!sub) throw new NotFoundException();
    return this.prisma.studentSubscription.update({ where: { id: subscriptionId }, data: { status: SubscriptionStatus.FINISHED } });
  }

  async listHomeworkTemplates(userId: string) {
    return this.prisma.homeworkTemplate.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  }

  async createHomeworkTemplate(userId: string, dto: CreateHomeworkTemplateDto) {
    return this.prisma.homeworkTemplate.create({
      data: { userId, title: dto.title.trim(), text: dto.text.trim() },
    });
  }

  async deleteHomeworkTemplate(userId: string, templateId: string) {
    const tpl = await this.prisma.homeworkTemplate.findFirst({ where: { id: templateId, userId } });
    if (!tpl) throw new NotFoundException();
    await this.prisma.homeworkTemplate.delete({ where: { id: templateId } });
    return { ok: true };
  }

  async listHomeworkTasks(userId: string, studentId: string, q: StudentsRangeQueryDto | StudentsHomeworkQueryDto, status?: HomeworkStatus) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, userId } });
    if (!student) throw new NotFoundException();

    const where: any = { userId, studentId };
    if (status) where.status = status;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = q.from;
      if (q.to) where.createdAt.lte = q.to;
    }

    return this.prisma.homeworkTask.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createHomeworkTask(userId: string, studentId: string, dto: CreateHomeworkTaskDto) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, userId } });
    if (!student) throw new NotFoundException();

    const templateId = typeof dto.templateId === 'string' ? dto.templateId.trim() : null;
    if (templateId) {
      const tpl = await this.prisma.homeworkTemplate.findFirst({ where: { id: templateId, userId } });
      if (!tpl) throw new NotFoundException('Template not found');
    }

    return this.prisma.homeworkTask.create({
      data: {
        userId,
        studentId,
        templateId,
        title: dto.title.trim(),
        text: dto.text.trim(),
        dueAt: dto.dueAt ? this.parseDate(dto.dueAt) : null,
        status: HomeworkStatus.ASSIGNED,
      },
    });
  }

  async updateHomeworkTask(userId: string, studentId: string, taskId: string, patch: UpdateHomeworkTaskDto) {
    const task = await this.prisma.homeworkTask.findFirst({ where: { id: taskId, userId, studentId } });
    if (!task) throw new NotFoundException();

    const data: any = {};
    if (typeof patch.title === 'string') data.title = patch.title.trim();
    if (typeof patch.text === 'string') data.text = patch.text.trim();
    if (patch.status) data.status = patch.status;
    if (patch.dueAt === null) data.dueAt = null;
    else if (patch.dueAt) data.dueAt = this.parseDate(patch.dueAt);

    return this.prisma.homeworkTask.update({ where: { id: taskId }, data });
  }

  async deleteHomeworkTask(userId: string, studentId: string, taskId: string) {
    const task = await this.prisma.homeworkTask.findFirst({ where: { id: taskId, userId, studentId } });
    if (!task) throw new NotFoundException();
    await this.prisma.homeworkTask.delete({ where: { id: taskId } });
    return { ok: true };
  }
}
