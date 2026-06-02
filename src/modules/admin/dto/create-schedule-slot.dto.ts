import { IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class CreateScheduleSlotDto {
  @IsString()
  classId: string;

  @IsString()
  subjectId: string;

  @IsInt()
  @Min(1)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'timeStart harus format HH:mm' })
  timeStart: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'timeEnd harus format HH:mm' })
  timeEnd: string;

  @IsString()
  room: string;
}
