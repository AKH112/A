import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HomeworkService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, lessonId: string, text: string) {
    const lesson = await this.prisma.lesson.findFirst({ where: { id: lessonId, userId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return this.prisma.homework.upsert({
      where: { lessonId },
      create: {
        lessonId,
        text,
        status: 'ASSIGNED',
      },
      update: {
        text,
        status: 'ASSIGNED',
      },
    });
  }

  async findByLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({ where: { id: lessonId, userId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return this.prisma.homework.findUnique({ where: { lessonId } });
  }
}

