import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateClassSubjectDto {
  @IsString()
  classId: string;

  @IsString()
  subjectId: string;

  @IsString()
  teacherId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  totalMeetings?: number;
}
