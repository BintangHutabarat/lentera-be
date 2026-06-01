import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { StudentsService } from './students.service';

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
}
