import * as crypto from 'crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceStatus, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from '../admin/dto/create-student.dto';
import { CreateTeacherDto } from '../admin/dto/create-teacher.dto';
import { ResetPasswordDto } from '../admin/dto/reset-password.dto';
import { UpdateStudentDto } from '../admin/dto/update-student.dto';
import { UpdateTeacherDto } from '../admin/dto/update-teacher.dto';

@Injectable()
export class PrincipalService {
  constructor(private prisma: PrismaService) {}

  private async getPrincipal(userId: string) {
    const principal = await this.prisma.principal.findUnique({
      where: { userId },
      include: { user: { include: { school: true } } },
    });
    if (!principal) {
      throw new NotFoundException({ code: 'PRINCIPAL_NOT_FOUND', message: 'Kepala sekolah tidak ditemukan' });
    }
    return principal;
  }

  private async assertTargetIsManageable(targetUser: { role: Role } | null) {
    if (!targetUser) return;
    if (targetUser.role === Role.ADMIN || targetUser.role === Role.PRINCIPAL) {
      throw new ForbiddenException({
        code: 'CANNOT_MANAGE_ADMIN',
        message: 'Kepala sekolah tidak dapat mengelola akun admin/kepala sekolah',
      });
    }
  }

  private generatePassword(): string {
    return crypto.randomBytes(4).toString('hex');
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const principal = await this.getPrincipal(userId);
    return {
      id: principal.userId,
      name: principal.name,
      email: principal.user.email,
      school: {
        id: principal.user.school.id,
        name: principal.user.school.name,
        code: principal.user.school.code,
      },
    };
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async getUsers(userId: string, role?: string, classId?: string) {
    const principal = await this.getPrincipal(userId);
    const schoolId = principal.user.schoolId;

    const where: any = { schoolId, role: { in: [Role.STUDENT, Role.TEACHER] } };
    if (role) where.role = role;

    const users = await this.prisma.user.findMany({
      where,
      include: { student: { include: { class: true } }, teacher: true },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = classId
      ? users.filter((u) => u.student?.classId === classId)
      : users;

    return filtered.map((u) => ({
      id: u.id,
      role: u.role,
      email: u.email,
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      profile: u.student
        ? { name: u.student.name, nis: u.student.nis, class: u.student.class.name }
        : u.teacher
          ? { name: u.teacher.name, nip: u.teacher.nip, title: u.teacher.title }
          : null,
    }));
  }

  async getUser(userId: string, targetId: string) {
    const principal = await this.getPrincipal(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      include: { student: { include: { class: true } }, teacher: true },
    });
    if (!user || user.schoolId !== principal.user.schoolId) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User tidak ditemukan' });
    }
    await this.assertTargetIsManageable(user);
    return {
      id: user.id,
      role: user.role,
      email: user.email,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      student: user.student
        ? {
            name: user.student.name,
            nis: user.student.nis,
            classId: user.student.classId,
            class: user.student.class.name,
            level: user.student.level,
            xp: user.student.xp,
          }
        : null,
      teacher: user.teacher
        ? { name: user.teacher.name, nip: user.teacher.nip, title: user.teacher.title }
        : null,
    };
  }

  async createStudent(userId: string, dto: CreateStudentDto) {
    const principal = await this.getPrincipal(userId);
    const schoolId = principal.user.schoolId;

    const existing = await this.prisma.student.findUnique({ where: { nis: dto.nis } });
    if (existing) throw new ConflictException({ code: 'NIS_TAKEN', message: 'NIS sudah digunakan' });

    if (dto.email) {
      const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (emailTaken) throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email sudah digunakan' });
    }

    const cls = await this.prisma.class.findUnique({ where: { id: dto.classId } });
    if (!cls || cls.schoolId !== schoolId) {
      throw new NotFoundException({ code: 'CLASS_NOT_FOUND', message: 'Kelas tidak ditemukan' });
    }

    const plainPassword = dto.password ?? this.generatePassword();
    const passwordHash = await argon2.hash(plainPassword);

    const user = await this.prisma.user.create({
      data: {
        schoolId,
        role: Role.STUDENT,
        email: dto.email,
        passwordHash,
        mustChangePassword: true,
        student: { create: { name: dto.name, nis: dto.nis, classId: dto.classId } },
      },
    });

    return { id: user.id, nis: dto.nis, name: dto.name, temporaryPassword: plainPassword };
  }

  async createTeacher(userId: string, dto: CreateTeacherDto) {
    const principal = await this.getPrincipal(userId);
    const schoolId = principal.user.schoolId;

    const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (emailTaken) throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email sudah digunakan' });

    if (dto.nip) {
      const nipTaken = await this.prisma.teacher.findUnique({ where: { nip: dto.nip } });
      if (nipTaken) throw new ConflictException({ code: 'NIP_TAKEN', message: 'NIP sudah digunakan' });
    }

    const plainPassword = dto.password ?? this.generatePassword();
    const passwordHash = await argon2.hash(plainPassword);

    const user = await this.prisma.user.create({
      data: {
        schoolId,
        role: Role.TEACHER,
        email: dto.email,
        passwordHash,
        mustChangePassword: true,
        teacher: { create: { name: dto.name, nip: dto.nip, title: dto.title } },
      },
    });

    return { id: user.id, email: dto.email, name: dto.name, temporaryPassword: plainPassword };
  }

  async updateStudent(userId: string, targetId: string, dto: UpdateStudentDto) {
    const principal = await this.getPrincipal(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      include: { student: true },
    });
    if (!user || user.schoolId !== principal.user.schoolId || !user.student) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Siswa tidak ditemukan' });
    }
    await this.assertTargetIsManageable(user);

    if (dto.classId) {
      const cls = await this.prisma.class.findUnique({ where: { id: dto.classId } });
      if (!cls || cls.schoolId !== principal.user.schoolId) {
        throw new NotFoundException({ code: 'CLASS_NOT_FOUND', message: 'Kelas tidak ditemukan' });
      }
    }

    await this.prisma.$transaction([
      ...(dto.isActive !== undefined
        ? [this.prisma.user.update({ where: { id: targetId }, data: { isActive: dto.isActive } })]
        : []),
      ...(dto.name !== undefined || dto.classId !== undefined
        ? [
            this.prisma.student.update({
              where: { userId: targetId },
              data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.classId !== undefined && { classId: dto.classId }),
              },
            }),
          ]
        : []),
    ]);
  }

  async updateTeacher(userId: string, targetId: string, dto: UpdateTeacherDto) {
    const principal = await this.getPrincipal(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      include: { teacher: true },
    });
    if (!user || user.schoolId !== principal.user.schoolId || !user.teacher) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Guru tidak ditemukan' });
    }
    await this.assertTargetIsManageable(user);

    if (dto.email && dto.email !== user.email) {
      const taken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (taken) throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email sudah digunakan' });
    }

    await this.prisma.$transaction([
      ...(dto.isActive !== undefined || dto.email !== undefined
        ? [
            this.prisma.user.update({
              where: { id: targetId },
              data: {
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                ...(dto.email !== undefined && { email: dto.email }),
              },
            }),
          ]
        : []),
      ...(dto.name !== undefined || dto.nip !== undefined || dto.title !== undefined
        ? [
            this.prisma.teacher.update({
              where: { userId: targetId },
              data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.nip !== undefined && { nip: dto.nip }),
                ...(dto.title !== undefined && { title: dto.title }),
              },
            }),
          ]
        : []),
    ]);
  }

  async resetPassword(userId: string, targetId: string, dto: ResetPasswordDto) {
    const principal = await this.getPrincipal(userId);
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user || user.schoolId !== principal.user.schoolId) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User tidak ditemukan' });
    }
    await this.assertTargetIsManageable(user);

    const plainPassword = dto.newPassword ?? this.generatePassword();
    const passwordHash = await argon2.hash(plainPassword);

    await this.prisma.user.update({
      where: { id: targetId },
      data: { passwordHash, mustChangePassword: true },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId: targetId } });

    return { temporaryPassword: plainPassword };
  }

  async deleteUser(userId: string, targetId: string) {
    const principal = await this.getPrincipal(userId);
    if (targetId === userId) {
      throw new ForbiddenException({ code: 'CANNOT_DELETE_SELF', message: 'Tidak bisa menghapus akun sendiri' });
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user || user.schoolId !== principal.user.schoolId) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User tidak ditemukan' });
    }
    await this.assertTargetIsManageable(user);

    if (user.role === Role.TEACHER) {
      const classSubjectCount = await this.prisma.classSubject.count({
        where: { teacher: { userId: targetId } },
      });
      if (classSubjectCount > 0) {
        throw new ConflictException({
          code: 'TEACHER_HAS_CLASS_SUBJECTS',
          message: `Guru masih mengajar ${classSubjectCount} mata pelajaran. Hapus atau pindahkan terlebih dahulu sebelum menghapus guru.`,
        });
      }
    }

    await this.prisma.user.delete({ where: { id: targetId } });
  }

  // ── Classes ────────────────────────────────────────────────────────────────

  async getClasses(userId: string) {
    const principal = await this.getPrincipal(userId);
    const classes = await this.prisma.class.findMany({
      where: { schoolId: principal.user.schoolId },
      include: { _count: { select: { students: true, classSubjects: true } } },
      orderBy: [{ gradeYear: 'asc' }, { name: 'asc' }],
    });
    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      gradeYear: c.gradeYear,
      studentCount: c._count.students,
      subjectCount: c._count.classSubjects,
    }));
  }

  async getClassDetail(userId: string, classId: string) {
    const principal = await this.getPrincipal(userId);
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          include: { user: { select: { isActive: true, email: true } } },
          orderBy: { name: 'asc' },
        },
        classSubjects: {
          include: {
            subject: { select: { id: true, name: true, shortName: true, color: true, iconKey: true } },
            teacher: { select: { userId: true, name: true, title: true } },
            _count: { select: { assignments: true, quizzes: true, exams: true } },
          },
        },
      },
    });
    if (!cls || cls.schoolId !== principal.user.schoolId) {
      throw new NotFoundException({ code: 'CLASS_NOT_FOUND', message: 'Kelas tidak ditemukan' });
    }
    return {
      id: cls.id,
      name: cls.name,
      gradeYear: cls.gradeYear,
      students: cls.students.map((s) => ({
        id: s.userId,
        name: s.name,
        nis: s.nis,
        email: s.user.email,
        isActive: s.user.isActive,
        level: s.level,
        xp: s.xp,
      })),
      classSubjects: cls.classSubjects.map((cs) => ({
        id: cs.id,
        subject: { ...cs.subject, color: cs.subject.color.toLowerCase() },
        teacher: cs.teacher,
        assignmentCount: cs._count.assignments,
        quizCount: cs._count.quizzes,
        examCount: cs._count.exams,
      })),
    };
  }

  // ── Final Grades & Reports ─────────────────────────────────────────────────

  async getClassSubjectFinalGrades(
    userId: string,
    classSubjectId: string,
    academicYearId: string,
  ) {
    const principal = await this.getPrincipal(userId);
    const cs = await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: {
        class: true,
        subject: { select: { id: true, name: true, shortName: true } },
        teacher: { select: { userId: true, name: true } },
      },
    });
    if (!cs || cs.class.schoolId !== principal.user.schoolId) {
      throw new NotFoundException({ code: 'CLASS_SUBJECT_NOT_FOUND', message: 'Kelas-mapel tidak ditemukan' });
    }

    const ay = await this.prisma.academicYear.findUnique({ where: { id: academicYearId } });
    if (!ay || ay.schoolId !== principal.user.schoolId) {
      throw new NotFoundException({ code: 'ACADEMIC_YEAR_NOT_FOUND', message: 'Tahun ajaran tidak ditemukan' });
    }

    const [students, grades] = await Promise.all([
      this.prisma.student.findMany({
        where: { classId: cs.classId },
        select: { userId: true, name: true, nis: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.finalGrade.findMany({
        where: { classSubjectId, academicYearId },
      }),
    ]);
    const map = new Map(grades.map((g) => [g.studentId, g]));

    return {
      classSubjectId,
      subject: cs.subject,
      teacher: cs.teacher,
      academicYearLabel: ay.label,
      entries: students.map((s) => {
        const g = map.get(s.userId);
        return {
          studentId: s.userId,
          name: s.name,
          nis: s.nis,
          refAssignment: g?.refAssignment ?? null,
          refQuiz: g?.refQuiz ?? null,
          refExam: g?.refExam ?? null,
          refAttendance: g?.refAttendance ?? null,
          finalGrade: g?.finalGrade ?? null,
          notes: g?.notes ?? null,
          gradedAt: g?.gradedAt ?? null,
        };
      }),
    };
  }

  async getClassReport(
    userId: string,
    classId: string,
    academicYearId: string,
  ) {
    const principal = await this.getPrincipal(userId);
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: { select: { userId: true, name: true, nis: true }, orderBy: { name: 'asc' } },
        classSubjects: {
          include: {
            subject: { select: { id: true, name: true, shortName: true } },
            teacher: { select: { userId: true, name: true } },
            finalGrades: { where: { academicYearId } },
            meetings: { select: { attendances: { select: { studentId: true, status: true } } } },
          },
        },
      },
    });
    if (!cls || cls.schoolId !== principal.user.schoolId) {
      throw new NotFoundException({ code: 'CLASS_NOT_FOUND', message: 'Kelas tidak ditemukan' });
    }

    const ay = await this.prisma.academicYear.findUnique({ where: { id: academicYearId } });
    if (!ay || ay.schoolId !== principal.user.schoolId) {
      throw new NotFoundException({ code: 'ACADEMIC_YEAR_NOT_FOUND', message: 'Tahun ajaran tidak ditemukan' });
    }

    const subjectsReport = cls.classSubjects.map((cs) => {
      const fgMap = new Map(cs.finalGrades.map((g) => [g.studentId, g]));
      const attendanceByStudent = new Map<string, { total: number; present: number }>();
      for (const m of cs.meetings) {
        for (const a of m.attendances) {
          const cur = attendanceByStudent.get(a.studentId) ?? { total: 0, present: 0 };
          cur.total++;
          if (a.status === AttendanceStatus.HADIR) cur.present++;
          attendanceByStudent.set(a.studentId, cur);
        }
      }
      return {
        classSubjectId: cs.id,
        subject: cs.subject,
        teacher: cs.teacher,
        students: cls.students.map((s) => {
          const fg = fgMap.get(s.userId);
          const att = attendanceByStudent.get(s.userId);
          return {
            studentId: s.userId,
            name: s.name,
            nis: s.nis,
            finalGrade: fg?.finalGrade ?? null,
            refAssignment: fg?.refAssignment ?? null,
            refQuiz: fg?.refQuiz ?? null,
            refExam: fg?.refExam ?? null,
            refAttendance: fg?.refAttendance ?? null,
            attendance: att
              ? {
                  total: att.total,
                  present: att.present,
                  percentage: Math.round((att.present / att.total) * 10000) / 100,
                }
              : null,
          };
        }),
      };
    });

    return {
      classId: cls.id,
      className: cls.name,
      gradeYear: cls.gradeYear,
      academicYearLabel: ay.label,
      subjects: subjectsReport,
    };
  }
}
