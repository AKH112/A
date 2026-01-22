import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateStudentInviteDto } from './dto/create-student-invite.dto';
import { InvitesService } from './invites.service';

type AuthenticatedRequest = { user: { userId: string } };

@Controller('invites')
export class InvitesController {
  constructor(private service: InvitesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('student')
  async createStudentInvite(@Request() req: AuthenticatedRequest, @Body() body: CreateStudentInviteDto) {
    return this.service.createStudentInvite(req.user.userId, body.studentId);
  }

  @Get(':token')
  async getStudentInvite(@Param('token') token: string) {
    return this.service.getStudentInviteByToken(token);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':token/accept')
  async acceptStudentInvite(@Request() req: AuthenticatedRequest, @Param('token') token: string) {
    return this.service.acceptStudentInvite(token, req.user.userId);
  }
}

