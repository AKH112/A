import { Body, Controller, Get, Query, Request, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FinanceService } from './finance.service';
import { FinanceRangeQueryDto } from './dto/finance-range-query.dto';
import { FinanceIncomeDto } from './dto/finance-income.dto';
import { FinanceExpenseDto } from './dto/finance-expense.dto';
import { FinanceTransferDto } from './dto/finance-transfer.dto';

type AuthenticatedRequest = { user: { userId: string } };

@UseGuards(AuthGuard('jwt'))
@Controller('finance')
export class FinanceController {
  constructor(private service: FinanceService) {}

  @Get('summary')
  async summary(@Request() req: AuthenticatedRequest, @Query() query: FinanceRangeQueryDto) {
    return this.service.getSummary(req.user.userId, {
      from: query.from,
      to: query.to,
      walletId: query.walletId,
    });
  }

  @Get('transactions')
  async transactions(@Request() req: AuthenticatedRequest, @Query() query: FinanceRangeQueryDto) {
    return this.service.listTransactions(req.user.userId, {
      from: query.from,
      to: query.to,
      walletId: query.walletId,
    });
  }

  @Post('income')
  async income(@Request() req: AuthenticatedRequest, @Body() body: FinanceIncomeDto) {
    return this.service.addIncome(req.user.userId, body);
  }

  @Post('expense')
  async expense(@Request() req: AuthenticatedRequest, @Body() body: FinanceExpenseDto) {
    return this.service.addExpense(req.user.userId, body);
  }

  @Post('transfer')
  async transfer(@Request() req: AuthenticatedRequest, @Body() body: FinanceTransferDto) {
    return this.service.transfer(req.user.userId, body);
  }
}
