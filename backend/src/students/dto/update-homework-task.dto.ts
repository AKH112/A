import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { HomeworkStatus } from '@prisma/client';

export class UpdateHomeworkTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  text?: string;

  @IsOptional()
  @IsEnum(HomeworkStatus)
  status?: HomeworkStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date | null;
}

