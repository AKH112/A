import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { LessonType } from '@prisma/client';

export class CreateLessonDto {
  @IsEnum(LessonType)
  type!: LessonType;

  @IsOptional()
  @IsString()
  studentId?: string;

  @Type(() => Date)
  @IsDate()
  startTime!: Date;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;
}
