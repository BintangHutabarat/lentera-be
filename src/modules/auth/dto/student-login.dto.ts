import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';

export class StudentLoginDto {
  @ApiProperty({ example: '12345678' })
  @IsString()
  @Length(1, 20)
  nis: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(1)
  password: string;
}
