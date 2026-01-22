import { IsOptional, IsString, Length, MinLength } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}

