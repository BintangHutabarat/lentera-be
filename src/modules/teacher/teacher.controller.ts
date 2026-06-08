import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { IsString } from 'class-validator';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { TeacherService } from './teacher.service';
import { ExportService } from './export.service';

class AnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  body: string;
}

class UpdateChapterContentDto {
  @IsString()
  content: string;
}

@ApiTags('teacher')
@ApiBearerAuth()
@Roles(Role.TEACHER)
@Controller('teacher')
export class TeacherController {
  constructor(
    private teacherService: TeacherService,
    private exportService: ExportService,
  ) {}

  // ── Profile & Subjects ─────────────────────────────────────────────────────

  @Get('me')
  getProfile(@CurrentUser() user: { id: string }) {
    return this.teacherService.getProfile(user.id);
  }

  @Get('subjects')
  getSubjects(@CurrentUser() user: { id: string }) {
    return this.teacherService.getSubjects(user.id);
  }

  @Get('subjects/:classSubjectId/students')
  getStudents(
    @CurrentUser() user: { id: string },
    @Param('classSubjectId') classSubjectId: string,
  ) {
    return this.teacherService.getStudents(user.id, classSubjectId);
  }

  // ── Assignments ────────────────────────────────────────────────────────────

  @ApiQuery({ name: 'classSubjectId', required: false })
  @Get('assignments')
  getAssignments(
    @CurrentUser() user: { id: string },
    @Query('classSubjectId') classSubjectId?: string,
  ) {
    return this.teacherService.getAssignments(user.id, classSubjectId);
  }

  @Post('assignments')
  @HttpCode(HttpStatus.CREATED)
  createAssignment(@CurrentUser() user: { id: string }, @Body() dto: CreateAssignmentDto) {
    return this.teacherService.createAssignment(user.id, dto);
  }

  @Get('assignments/:id')
  getAssignment(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.teacherService.getAssignment(user.id, id);
  }

  @Patch('assignments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateAssignment(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.teacherService.updateAssignment(user.id, id, dto);
  }

  @Delete('assignments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAssignment(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.teacherService.deleteAssignment(user.id, id);
  }

  // ── Submissions ────────────────────────────────────────────────────────────

  @Get('assignments/:id/submissions')
  getSubmissions(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.teacherService.getSubmissions(user.id, id);
  }

  @Get('assignments/:id/submissions/:studentId')
  getSubmission(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.teacherService.getSubmission(user.id, id, studentId);
  }

  @Post('assignments/:id/submissions/:studentId/grade')
  @HttpCode(HttpStatus.NO_CONTENT)
  gradeSubmission(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.teacherService.gradeSubmission(user.id, id, studentId, dto);
  }

  // ── Quizzes ────────────────────────────────────────────────────────────────

  @ApiQuery({ name: 'classSubjectId', required: false })
  @Get('quizzes')
  getQuizzes(
    @CurrentUser() user: { id: string },
    @Query('classSubjectId') classSubjectId?: string,
  ) {
    return this.teacherService.getQuizzes(user.id, classSubjectId);
  }

  @Post('quizzes')
  @HttpCode(HttpStatus.CREATED)
  createQuiz(@CurrentUser() user: { id: string }, @Body() dto: CreateQuizDto) {
    return this.teacherService.createQuiz(user.id, dto);
  }

  @Get('quizzes/:id')
  getQuiz(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.teacherService.getQuiz(user.id, id);
  }

  @Patch('quizzes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateQuiz(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateQuizDto,
  ) {
    return this.teacherService.updateQuiz(user.id, id, dto);
  }

  @Delete('quizzes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteQuiz(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.teacherService.deleteQuiz(user.id, id);
  }

  @Get('quizzes/:id/sessions')
  getQuizSessions(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.teacherService.getQuizSessions(user.id, id);
  }

  // ── Announcement ───────────────────────────────────────────────────────────

  @Post('subjects/:classSubjectId/announce')
  @HttpCode(HttpStatus.NO_CONTENT)
  createAnnouncement(
    @CurrentUser() user: { id: string },
    @Param('classSubjectId') classSubjectId: string,
    @Body() dto: AnnouncementDto,
  ) {
    return this.teacherService.createAnnouncement(user.id, classSubjectId, dto.title, dto.body);
  }

  // ── Student Progress ───────────────────────────────────────────────────────

  @Get('subjects/:classSubjectId/students/:studentId/progress')
  getStudentProgress(
    @CurrentUser() user: { id: string },
    @Param('classSubjectId') classSubjectId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.teacherService.getStudentProgress(user.id, classSubjectId, studentId);
  }

  // ── Chapter Content ────────────────────────────────────────────────────────

  @Patch('subjects/:classSubjectId/chapters/:chapterId/content')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateChapterContent(
    @CurrentUser() user: { id: string },
    @Param('classSubjectId') classSubjectId: string,
    @Param('chapterId') chapterId: string,
    @Body() dto: UpdateChapterContentDto,
  ) {
    return this.teacherService.updateChapterContent(user.id, classSubjectId, chapterId, dto.content);
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  @Get('assignments/:id/export')
  exportAssignmentScores(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.exportService.exportAssignmentScores(user.id, id, res);
  }

  @Get('quizzes/:id/export')
  exportQuizScores(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.exportService.exportQuizScores(user.id, id, res);
  }

  // ── Meetings & Attendance ──────────────────────────────────────────────────

  @Get('class-subjects/:id/meetings')
  getMeetings(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.teacherService.getMeetings(user.id, id);
  }

  @Post('class-subjects/:id/meetings')
  @HttpCode(HttpStatus.CREATED)
  openMeeting(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.teacherService.openMeeting(user.id, id);
  }

  @Patch('meetings/:id/close')
  @HttpCode(HttpStatus.NO_CONTENT)
  closeMeeting(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.teacherService.closeMeeting(user.id, id);
  }

  @Get('meetings/:id/attendance')
  getAttendance(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.teacherService.getAttendance(user.id, id);
  }

  @Patch('meetings/:id/attendance')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateAttendance(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
  ) {
    return this.teacherService.updateAttendance(user.id, id, dto);
  }
}
