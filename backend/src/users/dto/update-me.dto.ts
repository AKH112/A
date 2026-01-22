import { Transform } from 'class-transformer';
import { IsOptional, IsTimeZone } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsTimeZone()
  timezone?: string;
}

