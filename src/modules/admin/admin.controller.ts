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
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { CreateClassSubjectDto } from './dto/create-class-subject.dto';
import { CreateScheduleSlotDto } from './dto/create-schedule-slot.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { UpdateClassSubjectDto } from './dto/update-class-subject.dto';
import { UpdateScheduleSlotDto } from './dto/update-schedule-slot.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ── Profile ────────────────────────────────────────────────────────────────

  @Get('me')
  getProfile(@CurrentUser() user: { id: string }) {
    return this.adminService.getProfile(user.id);
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  @ApiQuery({ name: 'role', required: false, enum: ['STUDENT', 'TEACHER'] })
  @ApiQuery({ name: 'classId', required: false })
  @Get('users')
  getUsers(
    @CurrentUser() user: { id: string },
    @Query('role') role?: string,
    @Query('classId') classId?: string,
  ) {
    return this.adminService.getUsers(user.id, role, classId);
  }

  @Post('users/students')
  @HttpCode(HttpStatus.CREATED)
  createStudent(@CurrentUser() user: { id: string }, @Body() dto: CreateStudentDto) {
    return this.adminService.createStudent(user.id, dto);
  }

  @Post('users/teachers')
  @HttpCode(HttpStatus.CREATED)
  createTeacher(@CurrentUser() user: { id: string }, @Body() dto: CreateTeacherDto) {
    return this.adminService.createTeacher(user.id, dto);
  }

  @Get('users/:id')
  getUser(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.adminService.getUser(user.id, id);
  }

  @Patch('users/students/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateStudent(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.adminService.updateStudent(user.id, id, dto);
  }

  @Patch('users/teachers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateTeacher(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.adminService.updateTeacher(user.id, id, dto);
  }

  @Post('users/:id/reset-password')
  resetPassword(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.adminService.resetPassword(user.id, id, dto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.adminService.deleteUser(user.id, id);
  }

  // ── Classes ────────────────────────────────────────────────────────────────

  @Get('classes')
  getClasses(@CurrentUser() user: { id: string }) {
    return this.adminService.getClasses(user.id);
  }

  @Get('classes/:id')
  getClassDetail(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.adminService.getClassDetail(user.id, id);
  }

  @Post('classes')
  @HttpCode(HttpStatus.CREATED)
  createClass(@CurrentUser() user: { id: string }, @Body() dto: CreateClassDto) {
    return this.adminService.createClass(user.id, dto);
  }

  @Patch('classes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateClass(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.adminService.updateClass(user.id, id, dto);
  }

  @Delete('classes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteClass(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.adminService.deleteClass(user.id, id);
  }

  // ── Subjects ───────────────────────────────────────────────────────────────

  @Get('subjects')
  getSubjects(@CurrentUser() user: { id: string }) {
    return this.adminService.getSubjects(user.id);
  }

  @Post('subjects')
  @HttpCode(HttpStatus.CREATED)
  createSubject(@CurrentUser() user: { id: string }, @Body() dto: CreateSubjectDto) {
    return this.adminService.createSubject(user.id, dto);
  }

  @Patch('subjects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateSubject(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.adminService.updateSubject(user.id, id, dto);
  }

  @Delete('subjects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSubject(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.adminService.deleteSubject(user.id, id);
  }

  // ── ClassSubjects ──────────────────────────────────────────────────────────

  @ApiQuery({ name: 'classId', required: false })
  @Get('class-subjects')
  getClassSubjects(
    @CurrentUser() user: { id: string },
    @Query('classId') classId?: string,
  ) {
    return this.adminService.getClassSubjects(user.id, classId);
  }

  @Post('class-subjects')
  @HttpCode(HttpStatus.CREATED)
  createClassSubject(@CurrentUser() user: { id: string }, @Body() dto: CreateClassSubjectDto) {
    return this.adminService.createClassSubject(user.id, dto);
  }

  @Patch('class-subjects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateClassSubject(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateClassSubjectDto,
  ) {
    return this.adminService.updateClassSubject(user.id, id, dto);
  }

  @Delete('class-subjects/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteClassSubject(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.adminService.deleteClassSubject(user.id, id);
  }

  @Get('class-subjects/:id/assignments')
  getClassSubjectAssignments(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.adminService.getClassSubjectAssignments(user.id, id);
  }

  @Delete('assignments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAssignment(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.adminService.deleteAssignment(user.id, id);
  }

  @Get('class-subjects/:id/quizzes')
  getClassSubjectQuizzes(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.adminService.getClassSubjectQuizzes(user.id, id);
  }

  @Delete('quizzes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteQuiz(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.adminService.deleteQuiz(user.id, id);
  }

  // ── Schedule ───────────────────────────────────────────────────────────────

  @ApiQuery({ name: 'classId', required: false })
  @Get('schedule')
  getSchedule(
    @CurrentUser() user: { id: string },
    @Query('classId') classId?: string,
  ) {
    return this.adminService.getSchedule(user.id, classId);
  }

  @Post('schedule')
  @HttpCode(HttpStatus.CREATED)
  createScheduleSlot(@CurrentUser() user: { id: string }, @Body() dto: CreateScheduleSlotDto) {
    return this.adminService.createScheduleSlot(user.id, dto);
  }

  @Patch('schedule/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateScheduleSlot(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateScheduleSlotDto,
  ) {
    return this.adminService.updateScheduleSlot(user.id, id, dto);
  }

  @Delete('schedule/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteScheduleSlot(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.adminService.deleteScheduleSlot(user.id, id);
  }

  // ── Chapters ───────────────────────────────────────────────────────────────

  @Get('subjects/:subjectId/chapters')
  getChapters(@CurrentUser() user: { id: string }, @Param('subjectId') subjectId: string) {
    return this.adminService.getChapters(user.id, subjectId);
  }

  @Post('subjects/:subjectId/chapters')
  @HttpCode(HttpStatus.CREATED)
  createChapter(
    @CurrentUser() user: { id: string },
    @Param('subjectId') subjectId: string,
    @Body() dto: CreateChapterDto,
  ) {
    return this.adminService.createChapter(user.id, subjectId, dto);
  }

  @Patch('subjects/:subjectId/chapters/:chapterId')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateChapter(
    @CurrentUser() user: { id: string },
    @Param('subjectId') subjectId: string,
    @Param('chapterId') chapterId: string,
    @Body() dto: UpdateChapterDto,
  ) {
    return this.adminService.updateChapter(user.id, subjectId, chapterId, dto);
  }

  @Delete('subjects/:subjectId/chapters/:chapterId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteChapter(
    @CurrentUser() user: { id: string },
    @Param('subjectId') subjectId: string,
    @Param('chapterId') chapterId: string,
  ) {
    return this.adminService.deleteChapter(user.id, subjectId, chapterId);
  }
}
