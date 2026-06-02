import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class QuizOptionDto {
  @IsString()
  id: string;

  @IsString()
  text: string;
}

class QuizQuestionDto {
  @IsString()
  text: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options: QuizOptionDto[];

  @IsString()
  correctOptionId: string;

  @IsString()
  explanation: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}

export class CreateQuizDto {
  @IsString()
  classSubjectId: string;

  @IsString()
  title: string;

  @IsString()
  chapter: string;

  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];
}
