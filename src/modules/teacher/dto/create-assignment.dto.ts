import { AssignmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class RubricItemDto {
  @IsString()
  label: string;

  @IsInt()
  @Min(0)
  max: number;
}

export class CreateAssignmentDto {
  @IsString()
  classSubjectId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  instructions: string[];

  @IsEnum(AssignmentType)
  type: AssignmentType;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxScore?: number;

  @IsOptional()
  @IsString()
  totalItems?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minWords?: number;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  attachmentName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  attachmentSize?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricItemDto)
  rubric: RubricItemDto[];

  @IsDateString()
  dueAt: string;
}
