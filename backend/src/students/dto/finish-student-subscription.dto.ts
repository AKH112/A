import { IsOptional, IsString } from 'class-validator';

export class FinishStudentSubscriptionDto {
  @IsOptional()
  @IsString()
  note?: string;
}

