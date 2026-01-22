import { IsOptional, IsString } from 'class-validator';

export class TelegramTestMessageDto {
  @IsOptional()
  @IsString()
  text?: string;
}

