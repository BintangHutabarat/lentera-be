import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateChapterDto {
  @IsInt()
  @Min(1)
  order: number;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;
}
