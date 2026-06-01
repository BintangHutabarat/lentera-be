import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { StaffLoginDto } from './dto/staff-login.dto';
import { StudentLoginDto } from './dto/student-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('student/login')
  @HttpCode(HttpStatus.OK)
  studentLogin(@Body() dto: StudentLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.studentLogin(dto, res);
  }

  @Public()
  @Post('staff/login')
  @HttpCode(HttpStatus.OK)
  staffLogin(@Body() dto: StaffLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.staffLogin(dto, res);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.authService.logout(user.id, refreshToken, res);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return this.authService.me(user.id);
  }

  @ApiBearerAuth()
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.changePassword(user.id, dto, res);
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @CurrentUser() user: { sub: string; role: Role; refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refreshTokens(user.sub, user.role, user.refreshToken, res);
  }
}
