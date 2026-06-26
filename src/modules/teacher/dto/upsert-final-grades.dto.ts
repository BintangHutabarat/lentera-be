import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class FinalGradeEntryDto {
  @IsString()
  studentId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  finalGrade?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpsertFinalGradesDto {
  @IsString()
  academicYearId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FinalGradeEntryDto)
  entries: FinalGradeEntryDto[];
}
