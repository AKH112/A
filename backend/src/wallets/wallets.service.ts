import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';

@Injectable()
export class WalletsService {
  constructor(private prisma: PrismaService) {}

  async ensureDefault(userId: string) {
    const existing = await this.prisma.wallet.findFirst({ where: { userId, isArchived: false } });
    if (existing) return;
    await this.prisma.wallet.create({
      data: {
        userId,
        name: 'Мой счёт',
        currency: 'RUB',
        balance: 0,
        isFavorite: true,
      },
    });
  }

  async findAll(userId: string) {
    await this.ensureDefault(userId);
    return this.prisma.wallet.findMany({
      where: { userId, isArchived: false },
      orderBy: [{ isFavorite: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(userId: string, data: CreateWalletDto) {
    const name = data.name.trim();
    if (!name) throw new NotFoundException();
    return this.prisma.wallet.create({
      data: {
        userId,
        name,
        currency: typeof data.currency === 'string' ? data.currency.trim().toUpperCase() : 'RUB',
        balance: 0,
      },
    });
  }

  async update(userId: string, walletId: string, data: UpdateWalletDto) {
    const wallet = await this.prisma.wallet.findFirst({ where: { id: walletId, userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return this.prisma.wallet.update({
      where: { id: walletId },
      data: {
        name: typeof data.name === 'string' ? data.name.trim() : undefined,
        isFavorite: typeof data.isFavorite === 'boolean' ? data.isFavorite : undefined,
        isArchived: typeof data.isArchived === 'boolean' ? data.isArchived : undefined,
        currency: typeof data.currency === 'string' ? data.currency.trim().toUpperCase() : undefined,
      },
    });
  }
}
