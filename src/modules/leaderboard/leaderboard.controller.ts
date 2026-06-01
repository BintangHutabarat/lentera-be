import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('leaderboard')
@ApiBearerAuth()
@Roles(Role.STUDENT)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @ApiQuery({ name: 'limit', required: false })
  @Get('class')
  getClassLeaderboard(@CurrentUser() user: { id: string }, @Query('limit') limit?: string) {
    return this.leaderboardService.getClassLeaderboard(user.id, limit ? parseInt(limit) : 10);
  }
}
