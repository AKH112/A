import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { RemindPaymentDto } from './dto/remind-payment.dto';

type AuthenticatedRequest = { user: { userId: string } };

@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  async findAll(@Request() req: AuthenticatedRequest, @Query() query: ListNotificationsQueryDto) {
    return this.service.findAll(req.user.userId, query);
  }

  @Post('remind-payment')
  async remindPayment(@Request() req: AuthenticatedRequest, @Body() body: RemindPaymentDto) {
    const created = await this.service.createPaymentReminder(req.user.userId, body);
    return { ok: true, notificationId: created.id };
  }
}
