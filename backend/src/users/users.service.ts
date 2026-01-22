import { Injectable, NotFoundException } from '@nestjs/common';
import { HomeworkStatus, SubscriptionStatus, Tariff } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TeachersHomeworkQueryDto } from './dto/teachers-homework-query.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { subscription: true },
    });
  }

  async create(data: { email: string; password: string; name?: string }) {
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(data.password, salt);

    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        tariff: Tariff.FREE,
        subscription: {
          create: {
            plan: Tariff.FREE,
            startedAt: new Date(),
          },
        },
      },
    });
  }

  async updateTimezone(userId: string, timezone: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { timezone },
    });
  }

  async findTeachersForStudent(studentUserId: string) {
    const links = await this.prisma.studentTeacherLink.findMany({
      where: { studentUserId },
      include: { teacher: { select: { id: true, email: true, name: true, tariff: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const teachers = links.map((l) => l.teacher);
    const teacherIds = teachers.map((t) => t.id);

    const studentRecords = await this.prisma.student.findMany({
      where: { accountUserId: studentUserId, userId: { in: teacherIds } },
      select: { id: true, userId: true, balance: true, rateAmount: true, rateMinutes: true },
    });
    const recordByTeacherId = new Map(studentRecords.map((r) => [r.userId, r]));

    const activeSubs = await this.prisma.studentSubscription.findMany({
      where: {
        userId: { in: teacherIds },
        status: SubscriptionStatus.ACTIVE,
        student: { accountUserId: studentUserId },
      },
      select: { id: true, userId: true, studentId: true, title: true, lessonsLeft: true, lessonsTotal: true },
    });
    const activeSubByTeacherId = new Map(activeSubs.map((s) => [s.userId, s]));

    return teachers.map((t) => {
      const record = recordByTeacherId.get(t.id);
      const sub = activeSubByTeacherId.get(t.id);
      return {
        ...t,
        studentRecordId: record?.id ?? null,
        balance: record?.balance ?? 0,
        rateAmount: record?.rateAmount ?? null,
        rateMinutes: record?.rateMinutes ?? 60,
        subscription: sub
          ? { id: sub.id, title: sub.title, lessonsLeft: sub.lessonsLeft, lessonsTotal: sub.lessonsTotal }
          : null,
      };
    });
  }

  async unlinkTeacherForStudent(studentUserId: string, teacherId: string) {
    const link = await this.prisma.studentTeacherLink.findFirst({ where: { teacherId, studentUserId } });
    if (!link) throw new NotFoundException();

    await this.prisma.$transaction(async (tx) => {
      await tx.studentTeacherLink.delete({ where: { id: link.id } });
      await tx.student.updateMany({
        where: { userId: teacherId, accountUserId: studentUserId },
        data: { accountUserId: null },
      });
    });

    return { ok: true };
  }

  async listHomeworkForTeacher(studentUserId: string, teacherId: string, q: TeachersHomeworkQueryDto) {
    const from = q.from ? new Date(q.from as any) : undefined;
    const to = q.to ? new Date(q.to as any) : undefined;

    const where: any = {
      userId: teacherId,
      student: { accountUserId: studentUserId },
    };

    if (q.status) where.status = q.status as HomeworkStatus;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    return this.prisma.homeworkTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        text: true,
        status: true,
        dueAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
