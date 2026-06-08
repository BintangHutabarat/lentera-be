import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ExamGradeEntryDto {
  @IsString()
  studentId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpsertExamGradesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ExamGradeEntryDto)
  entries: ExamGradeEntryDto[];
}
