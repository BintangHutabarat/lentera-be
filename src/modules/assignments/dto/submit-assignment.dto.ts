import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class SubmitAssignmentDto {
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  fileSize?: number;

  @IsOptional()
  @IsString()
  essayText?: string;

  @IsOptional()
  @IsObject()
  answers?: Record<string, string>;

  @IsOptional()
  @IsString()
  note?: string;
}
