import { Controller, Body, Delete, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { TeachersHomeworkQueryDto } from './dto/teachers-homework-query.dto';

type AuthenticatedRequest = { user: { userId: string } };

@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async me(@Request() req: AuthenticatedRequest) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) return null;
    const { passwordHash, ...safe } = user as any;
    return safe;
  }

  @Patch('me')
  async updateMe(@Request() req: AuthenticatedRequest, @Body() body: UpdateMeDto) {
    if (!body.timezone) return this.me(req);
    const updated = await this.usersService.updateTimezone(req.user.userId, body.timezone);
    const { passwordHash, ...safe } = updated as any;
    return safe;
  }

  @Get('me/teachers')
  async myTeachers(@Request() req: AuthenticatedRequest) {
    return this.usersService.findTeachersForStudent(req.user.userId);
  }

  @Delete('me/teachers/:teacherId')
  async unlinkTeacher(@Request() req: AuthenticatedRequest, @Param('teacherId') teacherId: string) {
    return this.usersService.unlinkTeacherForStudent(req.user.userId, teacherId);
  }

  @Get('me/teachers/:teacherId/homework')
  async teacherHomework(
    @Request() req: AuthenticatedRequest,
    @Param('teacherId') teacherId: string,
    @Query() q: TeachersHomeworkQueryDto,
  ) {
    return this.usersService.listHomeworkForTeacher(req.user.userId, teacherId, q);
  }
}
