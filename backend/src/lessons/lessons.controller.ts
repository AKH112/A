import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { GetLessonsQueryDto } from './dto/get-lessons-query.dto';
import { PayLessonDto } from './dto/pay-lesson.dto';

type AuthenticatedRequest = { user: { userId: string } };

@UseGuards(AuthGuard('jwt'))
@Controller('lessons')
export class LessonsController {
  constructor(private service: LessonsService) {}

  @Get()
  async findAll(@Request() req: AuthenticatedRequest, @Query() query: GetLessonsQueryDto) {
    if (query.from.getTime() > query.to.getTime()) throw new BadRequestException('Invalid date range');
    return this.service.findAll(req.user.userId, query.from, query.to);
  }

  @Post()
  async create(@Request() req: AuthenticatedRequest, @Body() body: CreateLessonDto) {
    const end = new Date(body.startTime.getTime() + body.duration * 60000);

    return this.service.create(req.user.userId, {
      type: body.type,
      studentId: body.studentId,
      startTime: body.startTime,
      endTime: end,
      duration: body.duration,
      price: body.price,
    });
  }

  @Get(':id')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.findOne(id, req.user.userId);
  }

  @Post(':id/complete')
  async complete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.service.complete(id, req.user.userId);
    return { success: true };
  }

  @Post(':id/pay')
  async pay(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: PayLessonDto) {
    await this.service.pay(id, req.user.userId, body.amount);
    return { success: true };
  }

  @Delete(':id')
  async delete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.service.delete(id, req.user.userId);
    return { success: true };
  }
}
