import { SubjectColor } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  shortName?: string;

  @IsEnum(SubjectColor)
  color: SubjectColor;

  @IsString()
  iconKey: string;
}
