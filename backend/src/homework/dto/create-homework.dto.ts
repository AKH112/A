import { IsString, MinLength } from 'class-validator';

export class CreateHomeworkDto {
  @IsString()
  lessonId!: string;

  @IsString()
  @MinLength(1)
  text!: string;
}

