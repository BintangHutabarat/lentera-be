import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
