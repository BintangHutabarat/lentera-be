import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AssignmentsService } from './assignments.service';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';

@ApiTags('assignments')
@ApiBearerAuth()
@Roles(Role.STUDENT)
@Controller('assignments')
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @ApiQuery({ name: 'status', required: false, enum: ['segera', 'belum', 'selesai', 'all'] })
  @ApiQuery({ name: 'subjectId', required: false })
  @Get()
  getAssignments(
    @CurrentUser() user: { id: string },
    @Query('status') status?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.assignmentsService.getAssignments(user.id, status, subjectId);
  }

  @Get(':id')
  getAssignment(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.assignmentsService.getAssignment(user.id, id);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.CREATED)
  submit(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.assignmentsService.submit(user.id, id, dto);
  }
}
