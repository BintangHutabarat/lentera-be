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
import { CreateStudentDto } from '../admin/dto/create-student.dto';
import { CreateTeacherDto } from '../admin/dto/create-teacher.dto';
import { ResetPasswordDto } from '../admin/dto/reset-password.dto';
import { UpdateStudentDto } from '../admin/dto/update-student.dto';
import { UpdateTeacherDto } from '../admin/dto/update-teacher.dto';
import { PrincipalService } from './principal.service';

@ApiTags('principal')
@ApiBearerAuth()
@Roles(Role.PRINCIPAL)
@Controller('principal')
export class PrincipalController {
  constructor(private principalService: PrincipalService) {}

  // ── Profile ────────────────────────────────────────────────────────────────

  @Get('me')
  getProfile(@CurrentUser() user: { id: string }) {
    return this.principalService.getProfile(user.id);
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
    return this.principalService.getUsers(user.id, role, classId);
  }

  @Post('users/students')
  @HttpCode(HttpStatus.CREATED)
  createStudent(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateStudentDto,
  ) {
    return this.principalService.createStudent(user.id, dto);
  }

  @Post('users/teachers')
  @HttpCode(HttpStatus.CREATED)
  createTeacher(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTeacherDto,
  ) {
    return this.principalService.createTeacher(user.id, dto);
  }

  @Get('users/:id')
  getUser(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.principalService.getUser(user.id, id);
  }

  @Patch('users/students/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateStudent(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.principalService.updateStudent(user.id, id, dto);
  }

  @Patch('users/teachers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateTeacher(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.principalService.updateTeacher(user.id, id, dto);
  }

  @Post('users/:id/reset-password')
  resetPassword(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.principalService.resetPassword(user.id, id, dto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.principalService.deleteUser(user.id, id);
  }

  // ── Classes ────────────────────────────────────────────────────────────────

  @Get('classes')
  getClasses(@CurrentUser() user: { id: string }) {
    return this.principalService.getClasses(user.id);
  }

  @Get('classes/:id')
  getClassDetail(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.principalService.getClassDetail(user.id, id);
  }

  // ── Final Grades & Reports ─────────────────────────────────────────────────

  @ApiQuery({ name: 'academicYearId', required: true })
  @ApiQuery({ name: 'semester', required: true, enum: [1, 2] })
  @Get('class-subjects/:id/final-grades')
  getClassSubjectFinalGrades(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Query('academicYearId') academicYearId: string,
    @Query('semester') semester: string,
  ) {
    return this.principalService.getClassSubjectFinalGrades(
      user.id,
      id,
      academicYearId,
      parseInt(semester, 10),
    );
  }

  @ApiQuery({ name: 'academicYearId', required: true })
  @ApiQuery({ name: 'semester', required: true, enum: [1, 2] })
  @Get('classes/:id/report')
  getClassReport(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Query('academicYearId') academicYearId: string,
    @Query('semester') semester: string,
  ) {
    return this.principalService.getClassReport(
      user.id,
      id,
      academicYearId,
      parseInt(semester, 10),
    );
  }
}
