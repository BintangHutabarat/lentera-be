import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

class RubricScoreDto {
  @IsString()
  label: string;

  @IsInt()
  @Min(0)
  score: number;
}

export class GradeSubmissionDto {
  @IsInt()
  @Min(0)
  score: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricScoreDto)
  rubricBreakdown?: RubricScoreDto[];
}
