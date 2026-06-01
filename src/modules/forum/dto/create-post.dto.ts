import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsString()
  subjectId?: string;
}
