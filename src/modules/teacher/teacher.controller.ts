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
  Put,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MateriType, Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { UpsertExamGradesDto } from './dto/upsert-exam-grades.dto';
import { UpsertFinalGradesDto } from './dto/upsert-final-grades.dto';
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

class MateriAttachmentDto {
  @IsEnum(MateriType)
  type: MateriType;

  @IsString()
  content: string;

  @IsString()
  fileName: string;
}

class CreateMateriDto {
  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MateriAttachmentDto)
  attachments?: MateriAttachmentDto[];
}

class ChapterDto {
  @IsString()
  title: string;
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

  // ── Materi (MateriItem) ────────────────────────────────────────────────────

  @Get('subjects/:classSubjectId/materi')
  getMateri(
    @CurrentUser() user: { id: string },
    @Param('classSubjectId') classSubjectId: string,
  ) {
    return this.teacherService.getMateri(user.id, classSubjectId);
  }

  @Get('subjects/:classSubjectId/materi/:materiId')
  getMateriDetail(
    @CurrentUser() user: { id: string },
    @Param('classSubjectId') classSubjectId: string,
    @Param('materiId') materiId: string,
  ) {
    return this.teacherService.getMateriDetail(user.id, classSubjectId, materiId);
  }

  @Post('subjects/:classSubjectId/materi')
  @HttpCode(HttpStatus.CREATED)
  createMateri(
    @CurrentUser() user: { id: string },
    @Param('classSubjectId') classSubjectId: string,
    @Body() dto: CreateMateriDto,
  ) {
    return this.teacherService.createMateri(user.id, classSubjectId, dto);
  }

  @Delete('subjects/:classSubjectId/materi/:materiId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteMateri(
    @CurrentUser() user: { id: string },
    @Param('classSubjectId') classSubjectId: string,
    @Param('materiId') materiId: string,
  ) {
    return this.teacherService.deleteMateri(user.id, classSubjectId, materiId);
  }

  // ── Chapter / Materi management ──────────────────────────────────────────────

  @Get('subjects/:classSubjectId/chapters')
  getChapters(
    @CurrentUser() user: { id: string },
    @Param('classSubjectId') classSubjectId: string,
  ) {
    return this.teacherService.getChapters(user.id, classSubjectId);
  }

  @Get('subjects/:classSubjectId/chapters/:chapterId')
  getChapter(
    @CurrentUser() user: { id: string },
    @Param('classSubjectId') classSubjectId: string,
    @Param('chapterId') chapterId: string,
  ) {
    return this.teacherService.getChapter(user.id, classSubjectId, chapterId);
  }

  @Post('subjects/:classSubjectId/chapters')
  @HttpCode(HttpStatus.CREATED)
  createChapter(
    @CurrentUser() user: { id: string },
    @Param('classSubjectId') classSubjectId: string,
    @Body() dto: ChapterDto,
  ) {
    return this.teacherService.createChapter(user.id, classSubjectId, dto.title);
  }

  @Patch('subjects/:classSubjectId/chapters/:chapterId')
  @HttpCode(HttpStatus.NO_CONTENT)
  renameChapter(
    @CurrentUser() user: { id: string },
    @Param('classSubjectId') classSubjectId: string,
    @Param('chapterId') chapterId: string,
    @Body() dto: ChapterDto,
  ) {
    return this.teacherService.renameChapter(user.id, classSubjectId, chapterId, dto.title);
  }

  @Delete('subjects/:classSubjectId/chapters/:chapterId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteChapter(
    @CurrentUser() user: { id: string },
    @Param('classSubjectId') classSubjectId: string,
    @Param('chapterId') chapterId: string,
  ) {
    return this.teacherService.deleteChapter(user.id, classSubjectId, chapterId);
  }

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

  // ── Exams ──────────────────────────────────────────────────────────────────

  @Get('class-subjects/:id/exams')
  getExams(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.teacherService.getExams(user.id, id);
  }

  @Post('class-subjects/:id/exams')
  @HttpCode(HttpStatus.CREATED)
  createExam(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: CreateExamDto,
  ) {
    return this.teacherService.createExam(user.id, id, dto);
  }

  @Patch('exams/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateExam(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.teacherService.updateExam(user.id, id, dto);
  }

  @Delete('exams/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteExam(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.teacherService.deleteExam(user.id, id);
  }

  @Get('exams/:id/grades')
  getExamGrades(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.teacherService.getExamGrades(user.id, id);
  }

  @Put('exams/:id/grades')
  @HttpCode(HttpStatus.NO_CONTENT)
  upsertExamGrades(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpsertExamGradesDto,
  ) {
    return this.teacherService.upsertExamGrades(user.id, id, dto);
  }

  // ── Final Grades ───────────────────────────────────────────────────────────

  @ApiQuery({ name: 'academicYearId', required: true })
  @Get('class-subjects/:id/final-grades')
  getFinalGrades(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.teacherService.getFinalGrades(user.id, id, academicYearId);
  }

  @Put('class-subjects/:id/final-grades')
  @HttpCode(HttpStatus.NO_CONTENT)
  upsertFinalGrades(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpsertFinalGradesDto,
  ) {
    return this.teacherService.upsertFinalGrades(user.id, id, dto);
  }
}
