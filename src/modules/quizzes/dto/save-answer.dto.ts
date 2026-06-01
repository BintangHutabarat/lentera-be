import { IsIn, IsString } from 'class-validator';

export class SaveAnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  @IsIn(['a', 'b', 'c', 'd'])
  optionId: string;
}
