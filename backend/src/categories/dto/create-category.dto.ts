import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TransactionType } from '@prisma/client';

export class CreateCategoryDto {
  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  color?: string;
}
