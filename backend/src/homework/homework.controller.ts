import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';

type AuthenticatedRequest = { user: { userId: string } };

@UseGuards(AuthGuard('jwt'))
@Controller('homework')
export class HomeworkController {
  constructor(private service: HomeworkService) {}

  @Post()
  async create(@Request() req: AuthenticatedRequest, @Body() body: CreateHomeworkDto) {
    return this.service.create(req.user.userId, body.lessonId, body.text);
  }

  @Get('lesson/:lessonId')
  async getByLesson(@Request() req: AuthenticatedRequest, @Param('lessonId') id: string) {
    return this.service.findByLesson(req.user.userId, id);
  }
}
