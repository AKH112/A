import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CreateStudentPaymentDto } from './dto/create-student-payment.dto';
import { StudentsRangeQueryDto } from './dto/students-range-query.dto';
import { CreateStudentSubscriptionDto } from './dto/create-student-subscription.dto';
import { CreateHomeworkTemplateDto } from './dto/create-homework-template.dto';
import { CreateHomeworkTaskDto } from './dto/create-homework-task.dto';
import { StudentsHomeworkQueryDto } from './dto/students-homework-query.dto';
import { UpdateHomeworkTaskDto } from './dto/update-homework-task.dto';

type AuthenticatedRequest = { user: { userId: string } };

@UseGuards(AuthGuard('jwt'))
@Controller('students')
export class StudentsController {
  constructor(private service: StudentsService) {}

  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    return this.service.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const student = await this.service.findOne(id, req.user.userId);
    if (!student) throw new NotFoundException();
    return student;
  }

  @Post()
  async create(@Request() req: AuthenticatedRequest, @Body() body: CreateStudentDto) {
    return this.service.create(req.user.userId, body);
  }

  @Patch(':id')
  async update(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: UpdateStudentDto) {
    return this.service.update(req.user.userId, id, body);
  }

  @Get(':id/balance-events')
  async balanceEvents(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Query() q: StudentsRangeQueryDto) {
    return this.service.listBalanceEvents(req.user.userId, id, q);
  }

  @Delete(':id/balance-events/:eventId')
  async deleteBalanceEvent(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Param('eventId') eventId: string) {
    return this.service.deleteBalanceEvent(req.user.userId, id, eventId);
  }

  @Post(':id/payments')
  async createPayment(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: CreateStudentPaymentDto) {
    return this.service.createPayment(req.user.userId, id, body);
  }

  @Get(':id/subscriptions')
  async subscriptions(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Query('includeFinished') includeFinished?: string) {
    return this.service.listSubscriptions(req.user.userId, id, includeFinished === '1' || includeFinished === 'true');
  }

  @Post(':id/subscriptions')
  async createSubscription(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: CreateStudentSubscriptionDto) {
    return this.service.createSubscription(req.user.userId, id, body);
  }

  @Patch(':id/subscriptions/:subscriptionId/finish')
  async finishSubscription(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('subscriptionId') subscriptionId: string,
  ) {
    return this.service.finishSubscription(req.user.userId, id, subscriptionId);
  }

  @Get('homework/templates')
  async listTemplates(@Request() req: AuthenticatedRequest) {
    return this.service.listHomeworkTemplates(req.user.userId);
  }

  @Post('homework/templates')
  async createTemplate(@Request() req: AuthenticatedRequest, @Body() body: CreateHomeworkTemplateDto) {
    return this.service.createHomeworkTemplate(req.user.userId, body);
  }

  @Delete('homework/templates/:templateId')
  async deleteTemplate(@Request() req: AuthenticatedRequest, @Param('templateId') templateId: string) {
    return this.service.deleteHomeworkTemplate(req.user.userId, templateId);
  }

  @Get(':id/homework')
  async listHomework(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Query() q: StudentsHomeworkQueryDto) {
    return this.service.listHomeworkTasks(req.user.userId, id, q, q.status);
  }

  @Post(':id/homework')
  async createHomework(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: CreateHomeworkTaskDto) {
    return this.service.createHomeworkTask(req.user.userId, id, body);
  }

  @Patch(':id/homework/:taskId')
  async updateHomework(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() body: UpdateHomeworkTaskDto,
  ) {
    return this.service.updateHomeworkTask(req.user.userId, id, taskId, body);
  }

  @Delete(':id/homework/:taskId')
  async deleteHomework(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Param('taskId') taskId: string) {
    return this.service.deleteHomeworkTask(req.user.userId, id, taskId);
  }
}
