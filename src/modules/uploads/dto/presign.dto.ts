import { IsIn, IsNumber, IsString, Min } from 'class-validator';

export class PresignDto {
  @IsString()
  @IsIn(['assignment_submission', 'avatar'])
  purpose: string;

  @IsString()
  filename: string;

  @IsNumber()
  @Min(1)
  sizeBytes: number;

  @IsString()
  mimeType: string;
}
