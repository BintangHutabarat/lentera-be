import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsString, IsUrl } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { StudentsService } from './students.service';

class UpdateAvatarDto {
  @IsString()
  @IsUrl()
  avatarUrl: string;
}

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Roles(Role.STUDENT)
  @Get('me/profile')
  getProfile(@CurrentUser() user: { id: string }) {
    return this.studentsService.getProfile(user.id);
  }

  @Roles(Role.STUDENT)
  @Get('me/stats')
  getStats(@CurrentUser() user: { id: string }) {
    return this.studentsService.getStats(user.id);
  }

  @Roles(Role.STUDENT)
  @Get('me/badges')
  getBadges(@CurrentUser() user: { id: string }) {
    return this.studentsService.getBadges(user.id);
  }

  @Roles(Role.STUDENT)
  @Patch('me/avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateAvatar(@CurrentUser() user: { id: string }, @Body() dto: UpdateAvatarDto) {
    return this.studentsService.updateAvatar(user.id, dto.avatarUrl);
  }

  @Roles(Role.STUDENT)
  @Get('me/class-subjects/:id/attendance')
  getAttendance(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.studentsService.getAttendanceByClassSubject(user.id, id);
  }

  @Roles(Role.STUDENT)
  @Get('me/class-subjects/:id/materi')
  getMateri(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.studentsService.getMateri(user.id, id);
  }
}
