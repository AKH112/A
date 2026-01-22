import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { FinanceExpenseDto } from './dto/finance-expense.dto';
import { FinanceIncomeDto } from './dto/finance-income.dto';
import { FinanceTransferDto } from './dto/finance-transfer.dto';

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private walletsService: WalletsService,
  ) {}

  private parseAmount(value: unknown) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Invalid amount');
    return Math.round(amount);
  }

  private parseDate(value: unknown) {
    if (!value) return new Date();
    const d = new Date(value as any);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
    return d;
  }

  async listTransactions(userId: string, params: { from?: Date; to?: Date; walletId?: string }) {
    await this.walletsService.ensureDefault(userId);

    const where: Prisma.TransactionWhereInput = {
      Wallet: { userId },
    };

    if (params.walletId) where.walletId = params.walletId;
    if (params.from || params.to) {
      where.date = {};
      if (params.from) where.date.gte = params.from;
      if (params.to) where.date.lte = params.to;
    }

    return this.prisma.transaction.findMany({
      where,
      include: { Wallet: { select: { id: true, name: true, currency: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  async getSummary(userId: string, params: { from?: Date; to?: Date; walletId?: string }) {
    const whereBase: Prisma.TransactionWhereInput = {
      Wallet: { userId },
    };

    if (params.walletId) whereBase.walletId = params.walletId;
    if (params.from || params.to) {
      whereBase.date = {};
      if (params.from) whereBase.date.gte = params.from;
      if (params.to) whereBase.date.lte = params.to;
    }

    const [income, expense] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...whereBase, type: TransactionType.INCOME },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...whereBase, type: TransactionType.EXPENSE },
        _sum: { amount: true },
      }),
    ]);

    const incomeTotal = income._sum.amount ?? 0;
    const expenseTotal = expense._sum.amount ?? 0;

    return {
      income: incomeTotal,
      expense: expenseTotal,
      net: incomeTotal - expenseTotal,
    };
  }

  async addIncome(userId: string, body: FinanceIncomeDto) {
    const walletId = body.walletId.trim();
    const amount = this.parseAmount(body.amount);
    const date = this.parseDate(body.date);
    const comment = typeof body.comment === 'string' ? body.comment.trim() : null;
    const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : null;

    const wallet = await this.prisma.wallet.findFirst({ where: { id: walletId, userId, isArchived: false } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          id: randomUUID(),
          walletId,
          type: TransactionType.INCOME,
          amount,
          date,
          comment,
          categoryId,
        },
      });
      await tx.wallet.update({ where: { id: walletId }, data: { balance: { increment: amount } } });
      return created;
    });
  }

  async addExpense(userId: string, body: FinanceExpenseDto) {
    const walletId = body.walletId.trim();
    const amount = this.parseAmount(body.amount);
    const date = this.parseDate(body.date);
    const comment = typeof body.comment === 'string' ? body.comment.trim() : null;
    const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : null;

    const wallet = await this.prisma.wallet.findFirst({ where: { id: walletId, userId, isArchived: false } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          id: randomUUID(),
          walletId,
          type: TransactionType.EXPENSE,
          amount,
          date,
          comment,
          categoryId,
        },
      });
      await tx.wallet.update({ where: { id: walletId }, data: { balance: { decrement: amount } } });
      return created;
    });
  }

  async transfer(userId: string, body: FinanceTransferDto) {
    const fromWalletId = body.fromWalletId.trim();
    const toWalletId = body.toWalletId.trim();
    if (!fromWalletId || !toWalletId || fromWalletId === toWalletId) throw new BadRequestException('Invalid wallets');

    const amount = this.parseAmount(body.amount);
    const date = this.parseDate(body.date);
    const comment = typeof body.comment === 'string' ? body.comment.trim() : null;

    const [from, to] = await Promise.all([
      this.prisma.wallet.findFirst({ where: { id: fromWalletId, userId, isArchived: false } }),
      this.prisma.wallet.findFirst({ where: { id: toWalletId, userId, isArchived: false } }),
    ]);
    if (!from || !to) throw new NotFoundException('Wallet not found');

    return this.prisma.$transaction(async (tx) => {
      const outTx = await tx.transaction.create({
        data: {
          id: randomUUID(),
          walletId: fromWalletId,
          type: TransactionType.TRANSFER,
          amount: -amount,
          date,
          comment,
        },
      });
      const inTx = await tx.transaction.create({
        data: {
          id: randomUUID(),
          walletId: toWalletId,
          type: TransactionType.TRANSFER,
          amount: amount,
          date,
          comment,
        },
      });

      await tx.wallet.update({ where: { id: fromWalletId }, data: { balance: { decrement: amount } } });
      await tx.wallet.update({ where: { id: toWalletId }, data: { balance: { increment: amount } } });

      return { out: outTx, in: inTx };
    });
  }
}
