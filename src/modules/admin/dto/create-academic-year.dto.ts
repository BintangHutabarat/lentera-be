import { IsString, Matches } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  @Matches(/^\d{4}\/\d{4}$/, { message: 'Format harus YYYY/YYYY, contoh: 2025/2026' })
  label: string;
}
