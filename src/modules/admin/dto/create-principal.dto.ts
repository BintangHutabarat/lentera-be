import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePrincipalDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
