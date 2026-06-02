import { IsString } from 'class-validator';

export class UpdateClassSubjectDto {
  @IsString()
  teacherId: string;
}
