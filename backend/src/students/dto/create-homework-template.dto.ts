import { IsString, MinLength } from 'class-validator';

export class CreateHomeworkTemplateDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  text!: string;
}

