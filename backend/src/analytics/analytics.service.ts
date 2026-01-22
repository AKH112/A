import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(userId: string, range?: { from?: Date; to?: Date }) {
    const now = new Date();
    const fallbackFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const fallbackTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const from = range?.from ?? fallbackFrom;
    const to = range?.to ?? fallbackTo;

    const totalStudents = await this.prisma.student.count({ where: { userId } });

    const activeStudents = await this.prisma.student.count({
      where: {
        userId,
        lessons: { some: {} },
      },
    });

    const completedLessons = await this.prisma.lesson.aggregate({
      where: { userId, status: 'COMPLETED', startTime: { gte: from, lte: to } },
      _count: { id: true },
      _sum: { duration: true, price: true },
    });

    const scheduledLessons = await this.prisma.lesson.aggregate({
      where: { userId, status: { not: 'CANCELED' }, startTime: { gte: from, lte: to } },
      _count: { id: true },
      _sum: { duration: true, price: true },
    });

    const expected = await this.prisma.lesson.aggregate({
      where: { userId, status: 'PLANNED', startTime: { gte: from, lte: to } },
      _sum: { price: true },
      _count: { id: true },
    });

    const completedCount = completedLessons._count.id ?? 0;
    const completedMinutes = completedLessons._sum.duration ?? 0;
    const earnedTotal = completedLessons._sum.price ?? 0;
    const scheduledCount = scheduledLessons._count.id ?? 0;
    const scheduledMinutes = scheduledLessons._sum.duration ?? 0;
    const scheduledPriceTotal = scheduledLessons._sum.price ?? 0;
    const completedStartTimes = await this.prisma.lesson.findMany({
      where: { userId, status: 'COMPLETED', startTime: { gte: from, lte: to } },
      select: { startTime: true },
    });
    const dayKeys = new Set(completedStartTimes.map((l) => l.startTime.toISOString().slice(0, 10)));
    const distinctWorkDays = dayKeys.size;

    const rangeMs = Math.max(1, to.getTime() - from.getTime());
    const weeks = Math.max(1, rangeMs / (7 * 24 * 60 * 60 * 1000));
    const expectedCount = expected._count.id ?? 0;
    const expectedIncome = expected._sum.price ?? 0;

    const paidLessons = await this.prisma.lesson.aggregate({
      where: { userId, status: 'COMPLETED', isPaid: true, startTime: { gte: from, lte: to } },
      _sum: { price: true },
    });
    const paidTotal = paidLessons._sum.price ?? 0;

    return {
      period: { from, to },
      students: {
        total: totalStudents,
        active: activeStudents,
        inactive: Math.max(0, totalStudents - activeStudents),
        groups: 0,
      },
      lessons: {
        count: completedCount,
        minutes: completedMinutes,
      },
      finances: {
        earnedTotal,
        paidTotal,
      },
      averages: {
        lessonsPerWeek: Math.round(completedCount / weeks),
        workDaysPerWeek: Number((distinctWorkDays / weeks).toFixed(1)),
        hoursPerWeek: Number(((completedMinutes / 60) / weeks).toFixed(1)),
        incomePerWeek: Math.round(earnedTotal / weeks),
      },
      expected: {
        count: expectedCount,
        income: expectedIncome,
      },
    };
  }
}
