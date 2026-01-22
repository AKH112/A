import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class InvitesService {
  constructor(private prisma: PrismaService) {}

  async createStudentInvite(teacherId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, userId: teacherId },
      select: { id: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    const token = crypto.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    return this.prisma.studentInvite.create({
      data: {
        token,
        teacherId,
        studentId: student.id,
        expiresAt,
      },
    });
  }

  async getStudentInviteByToken(token: string) {
    const invite = await this.prisma.studentInvite.findUnique({
      where: { token },
      include: {
        teacher: { select: { id: true, email: true, name: true } },
        student: { select: { id: true, name: true } },
      },
    });
    if (!invite) throw new NotFoundException('Invite not found');

    const now = new Date();

    return {
      token: invite.token,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      expired: invite.expiresAt.getTime() <= now.getTime(),
      teacher: invite.teacher,
      student: invite.student,
    };
  }

  async acceptStudentInvite(token: string, studentUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.studentInvite.findUnique({
        where: { token },
        select: { teacherId: true, studentId: true, expiresAt: true, acceptedAt: true },
      });
      if (!invite) throw new NotFoundException('Invite not found');
      if (invite.acceptedAt) throw new ConflictException('Invite already accepted');
      if (invite.expiresAt.getTime() <= Date.now()) throw new BadRequestException('Invite expired');
      if (invite.teacherId === studentUserId) throw new BadRequestException('Cannot accept own invite');

      const link = await tx.studentTeacherLink.upsert({
        where: {
          teacherId_studentUserId: { teacherId: invite.teacherId, studentUserId },
        },
        create: { teacherId: invite.teacherId, studentUserId },
        update: {},
      });

      await tx.studentInvite.update({
        where: { token },
        data: { acceptedAt: new Date(), acceptedByUserId: studentUserId },
      });

      if (invite.studentId) {
        await tx.student.update({
          where: { id: invite.studentId },
          data: { accountUserId: studentUserId },
        });
      }

      return link;
    });
  }
}

