import { IsUUID } from 'class-validator';

export class CreateStudentInviteDto {
  @IsUUID()
  studentId!: string;
}

