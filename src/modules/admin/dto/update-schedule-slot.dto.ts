import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class UpdateScheduleSlotDto {
  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  dayOfWeek?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'timeStart harus format HH:mm' })
  timeStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'timeEnd harus format HH:mm' })
  timeEnd?: string;

  @IsOptional()
  @IsString()
  room?: string;
}
