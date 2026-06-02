import { IsString } from 'class-validator';

export class CreateClassSubjectDto {
  @IsString()
  classId: string;

  @IsString()
  subjectId: string;

  @IsString()
  teacherId: string;
}
