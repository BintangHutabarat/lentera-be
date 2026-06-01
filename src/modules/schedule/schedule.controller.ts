import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ScheduleService } from './schedule.service';

@ApiTags('schedule')
@ApiBearerAuth()
@Roles(Role.STUDENT)
@Controller('schedule')
export class ScheduleController {
  constructor(private scheduleService: ScheduleService) {}

  @Get('today')
  getToday(@CurrentUser() user: { id: string }) {
    return this.scheduleService.getToday(user.id);
  }

  @Get('week')
  getWeek(@CurrentUser() user: { id: string }) {
    return this.scheduleService.getWeek(user.id);
  }
}
