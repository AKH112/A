import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';

type AuthenticatedRequest = { user: { userId: string } };

@UseGuards(AuthGuard('jwt'))
@Controller('wallets')
export class WalletsController {
  constructor(private service: WalletsService) {}

  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    return this.service.findAll(req.user.userId);
  }

  @Post()
  async create(@Request() req: AuthenticatedRequest, @Body() body: CreateWalletDto) {
    return this.service.create(req.user.userId, body);
  }

  @Patch(':id')
  async update(@Request() req: AuthenticatedRequest, @Param('id') id: string, @Body() body: UpdateWalletDto) {
    return this.service.update(req.user.userId, id, body);
  }
}
