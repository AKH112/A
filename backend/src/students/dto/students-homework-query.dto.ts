import { Type } from 'class-transformer';
import { HomeworkStatus } from '@prisma/client';
import { IsDate, IsEnum, IsOptional } from 'class-validator';

export class StudentsHomeworkQueryDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @IsOptional()
  @IsEnum(HomeworkStatus)
  status?: HomeworkStatus;
}

