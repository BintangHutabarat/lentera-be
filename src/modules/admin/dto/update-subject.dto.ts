import { SubjectColor } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  shortName?: string;

  @IsOptional()
  @IsEnum(SubjectColor)
  color?: SubjectColor;

  @IsOptional()
  @IsString()
  iconKey?: string;
}
