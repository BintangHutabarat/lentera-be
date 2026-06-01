import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SubjectsService } from './subjects.service';

@ApiTags('subjects')
@ApiBearerAuth()
@Controller('subjects')
export class SubjectsController {
  constructor(private subjectsService: SubjectsService) {}

  @Roles(Role.STUDENT)
  @Get()
  getSubjectsList(@CurrentUser() user: { id: string }) {
    return this.subjectsService.getSubjectsList(user.id);
  }

  @Roles(Role.STUDENT)
  @Get(':id')
  getSubjectDetail(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.subjectsService.getSubjectDetail(user.id, id);
  }

  @Roles(Role.STUDENT)
  @Post('chapters/:chapterId/complete')
  @HttpCode(HttpStatus.NO_CONTENT)
  completeChapter(@CurrentUser() user: { id: string }, @Param('chapterId') chapterId: string) {
    return this.subjectsService.completeChapter(user.id, chapterId);
  }
}
