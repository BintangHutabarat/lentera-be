import * as crypto from 'crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
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

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private async getAdmin(userId: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { userId },
      include: { user: { include: { school: true } } },
    });
    if (!admin) throw new NotFoundException({ code: 'ADMIN_NOT_FOUND', message: 'Admin tidak ditemukan' });
    return admin;
  }

  private generatePassword(): string {
    return crypto.randomBytes(4).toString('hex'); // 8 hex chars
  }

  // ── Profile ────────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const admin = await this.getAdmin(userId);
    return {
      id: admin.userId,
      name: admin.name,
      scope: admin.scope,
      email: admin.user.email,
      school: {
        id: admin.user.school.id,
        name: admin.user.school.name,
        code: admin.user.school.code,
      },
    };
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async getUsers(userId: string, role?: string, classId?: string) {
    const admin = await this.getAdmin(userId);
    const schoolId = admin.user.schoolId;

    const where: any = { schoolId };
    if (role) where.role = role;

    const users = await this.prisma.user.findMany({
      where,
      include: {
        student: { include: { class: true } },
        teacher: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = classId
      ? users.filter(u => u.student?.classId === classId)
      : users;

    return filtered.map(u => ({
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

  async createStudent(userId: string, dto: CreateStudentDto) {
    const admin = await this.getAdmin(userId);
    const schoolId = admin.user.schoolId;

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
        student: {
          create: {
            name: dto.name,
            nis: dto.nis,
            classId: dto.classId,
          },
        },
      },
    });

    return { id: user.id, nis: dto.nis, name: dto.name, temporaryPassword: plainPassword };
  }

  async createTeacher(userId: string, dto: CreateTeacherDto) {
    const admin = await this.getAdmin(userId);
    const schoolId = admin.user.schoolId;

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
        teacher: {
          create: {
            name: dto.name,
            nip: dto.nip,
            title: dto.title,
          },
        },
      },
    });

    return { id: user.id, email: dto.email, name: dto.name, temporaryPassword: plainPassword };
  }

  async getUser(userId: string, targetId: string) {
    const admin = await this.getAdmin(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      include: {
        student: { include: { class: true } },
        teacher: true,
      },
    });
    if (!user || user.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User tidak ditemukan' });
    }

    return {
      id: user.id,
      role: user.role,
      email: user.email,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      student: user.student
        ? { name: user.student.name, nis: user.student.nis, classId: user.student.classId, class: user.student.class.name, level: user.student.level, xp: user.student.xp }
        : null,
      teacher: user.teacher
        ? { name: user.teacher.name, nip: user.teacher.nip, title: user.teacher.title }
        : null,
    };
  }

  async updateStudent(userId: string, targetId: string, dto: UpdateStudentDto) {
    const admin = await this.getAdmin(userId);
    const user = await this.prisma.user.findUnique({ where: { id: targetId }, include: { student: true } });
    if (!user || user.schoolId !== admin.user.schoolId || !user.student) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Siswa tidak ditemukan' });
    }

    if (dto.classId) {
      const cls = await this.prisma.class.findUnique({ where: { id: dto.classId } });
      if (!cls || cls.schoolId !== admin.user.schoolId) {
        throw new NotFoundException({ code: 'CLASS_NOT_FOUND', message: 'Kelas tidak ditemukan' });
      }
    }

    await this.prisma.$transaction([
      ...(dto.isActive !== undefined
        ? [this.prisma.user.update({ where: { id: targetId }, data: { isActive: dto.isActive } })]
        : []),
      ...(dto.name !== undefined || dto.classId !== undefined
        ? [this.prisma.student.update({
            where: { userId: targetId },
            data: {
              ...(dto.name !== undefined && { name: dto.name }),
              ...(dto.classId !== undefined && { classId: dto.classId }),
            },
          })]
        : []),
    ]);
  }

  async updateTeacher(userId: string, targetId: string, dto: UpdateTeacherDto) {
    const admin = await this.getAdmin(userId);
    const user = await this.prisma.user.findUnique({ where: { id: targetId }, include: { teacher: true } });
    if (!user || user.schoolId !== admin.user.schoolId || !user.teacher) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Guru tidak ditemukan' });
    }

    if (dto.email && dto.email !== user.email) {
      const taken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (taken) throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email sudah digunakan' });
    }

    await this.prisma.$transaction([
      ...(dto.isActive !== undefined || dto.email !== undefined
        ? [this.prisma.user.update({
            where: { id: targetId },
            data: {
              ...(dto.isActive !== undefined && { isActive: dto.isActive }),
              ...(dto.email !== undefined && { email: dto.email }),
            },
          })]
        : []),
      ...(dto.name !== undefined || dto.nip !== undefined || dto.title !== undefined
        ? [this.prisma.teacher.update({
            where: { userId: targetId },
            data: {
              ...(dto.name !== undefined && { name: dto.name }),
              ...(dto.nip !== undefined && { nip: dto.nip }),
              ...(dto.title !== undefined && { title: dto.title }),
            },
          })]
        : []),
    ]);
  }

  async resetPassword(userId: string, targetId: string, dto: ResetPasswordDto) {
    const admin = await this.getAdmin(userId);
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user || user.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User tidak ditemukan' });
    }

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
    const admin = await this.getAdmin(userId);
    if (targetId === userId) {
      throw new ForbiddenException({ code: 'CANNOT_DELETE_SELF', message: 'Tidak bisa menghapus akun sendiri' });
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (!user || user.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User tidak ditemukan' });
    }

    if (user.role === 'TEACHER') {
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
    const admin = await this.getAdmin(userId);
    const classes = await this.prisma.class.findMany({
      where: { schoolId: admin.user.schoolId },
      include: { _count: { select: { students: true, classSubjects: true } } },
      orderBy: [{ gradeYear: 'asc' }, { name: 'asc' }],
    });

    return classes.map(c => ({
      id: c.id,
      name: c.name,
      gradeYear: c.gradeYear,
      studentCount: c._count.students,
      subjectCount: c._count.classSubjects,
    }));
  }

  async createClass(userId: string, dto: CreateClassDto) {
    const admin = await this.getAdmin(userId);
    const existing = await this.prisma.class.findUnique({
      where: { schoolId_name: { schoolId: admin.user.schoolId, name: dto.name } },
    });
    if (existing) throw new ConflictException({ code: 'CLASS_NAME_TAKEN', message: 'Nama kelas sudah ada' });

    const cls = await this.prisma.class.create({
      data: { schoolId: admin.user.schoolId, name: dto.name, gradeYear: dto.gradeYear },
    });
    return { id: cls.id, name: cls.name, gradeYear: cls.gradeYear };
  }

  async updateClass(userId: string, classId: string, dto: UpdateClassDto) {
    const admin = await this.getAdmin(userId);
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls || cls.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'CLASS_NOT_FOUND', message: 'Kelas tidak ditemukan' });
    }
    await this.prisma.class.update({ where: { id: classId }, data: dto });
  }

  async deleteClass(userId: string, classId: string) {
    const admin = await this.getAdmin(userId);
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { _count: { select: { students: true, classSubjects: true } } },
    });
    if (!cls || cls.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'CLASS_NOT_FOUND', message: 'Kelas tidak ditemukan' });
    }
    if (cls._count.students > 0) {
      throw new ConflictException({ code: 'CLASS_HAS_STUDENTS', message: 'Kelas masih memiliki siswa' });
    }
    if (cls._count.classSubjects > 0) {
      throw new ConflictException({ code: 'CLASS_HAS_CLASS_SUBJECTS', message: `Kelas masih memiliki ${cls._count.classSubjects} mata pelajaran. Hapus semua mata pelajaran kelas terlebih dahulu.` });
    }
    await this.prisma.class.delete({ where: { id: classId } });
  }

  // ── Subjects ───────────────────────────────────────────────────────────────

  async getSubjects(userId: string) {
    const admin = await this.getAdmin(userId);
    const subjects = await this.prisma.subject.findMany({
      where: { schoolId: admin.user.schoolId },
      include: { _count: { select: { classOffers: true, chapters: true } } },
      orderBy: { name: 'asc' },
    });

    return subjects.map(s => ({
      id: s.id,
      name: s.name,
      shortName: s.shortName,
      color: s.color.toLowerCase(),
      iconKey: s.iconKey,
      classCount: s._count.classOffers,
      chapterCount: s._count.chapters,
    }));
  }

  async createSubject(userId: string, dto: CreateSubjectDto) {
    const admin = await this.getAdmin(userId);
    const existing = await this.prisma.subject.findUnique({
      where: { schoolId_name: { schoolId: admin.user.schoolId, name: dto.name } },
    });
    if (existing) throw new ConflictException({ code: 'SUBJECT_NAME_TAKEN', message: 'Nama mapel sudah ada' });

    const subject = await this.prisma.subject.create({
      data: { schoolId: admin.user.schoolId, name: dto.name, shortName: dto.shortName, color: dto.color, iconKey: dto.iconKey },
    });
    return { id: subject.id, name: subject.name };
  }

  async updateSubject(userId: string, subjectId: string, dto: UpdateSubjectDto) {
    const admin = await this.getAdmin(userId);
    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject || subject.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND', message: 'Mapel tidak ditemukan' });
    }
    await this.prisma.subject.update({ where: { id: subjectId }, data: dto });
  }

  async deleteSubject(userId: string, subjectId: string) {
    const admin = await this.getAdmin(userId);
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      include: { _count: { select: { classOffers: true } } },
    });
    if (!subject || subject.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND', message: 'Mapel tidak ditemukan' });
    }
    if (subject._count.classOffers > 0) {
      throw new ConflictException({ code: 'SUBJECT_IN_USE', message: 'Mapel masih digunakan di kelas' });
    }
    await this.prisma.subject.delete({ where: { id: subjectId } });
  }

  // ── ClassSubjects ──────────────────────────────────────────────────────────

  async getClassSubjects(userId: string, classId?: string) {
    const admin = await this.getAdmin(userId);
    const where: any = { class: { schoolId: admin.user.schoolId } };
    if (classId) where.classId = classId;

    const classSubjects = await this.prisma.classSubject.findMany({
      where,
      include: {
        class: true,
        subject: true,
        teacher: true,
        _count: { select: { assignments: true, quizzes: true } },
      },
    });

    return classSubjects.map(cs => ({
      id: cs.id,
      class: { id: cs.classId, name: cs.class.name },
      subject: { id: cs.subjectId, name: cs.subject.name, color: cs.subject.color.toLowerCase() },
      teacher: { id: cs.teacherId, name: cs.teacher.name },
      assignmentCount: cs._count.assignments,
      quizCount: cs._count.quizzes,
    }));
  }

  async createClassSubject(userId: string, dto: CreateClassSubjectDto) {
    const admin = await this.getAdmin(userId);
    const schoolId = admin.user.schoolId;

    const [cls, subject, teacher] = await Promise.all([
      this.prisma.class.findUnique({ where: { id: dto.classId } }),
      this.prisma.subject.findUnique({ where: { id: dto.subjectId } }),
      this.prisma.teacher.findUnique({ where: { userId: dto.teacherId }, include: { user: true } }),
    ]);

    if (!cls || cls.schoolId !== schoolId) throw new NotFoundException({ code: 'CLASS_NOT_FOUND', message: 'Kelas tidak ditemukan' });
    if (!subject || subject.schoolId !== schoolId) throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND', message: 'Mapel tidak ditemukan' });
    if (!teacher || teacher.user.schoolId !== schoolId) throw new NotFoundException({ code: 'TEACHER_NOT_FOUND', message: 'Guru tidak ditemukan' });

    const existing = await this.prisma.classSubject.findUnique({
      where: { classId_subjectId: { classId: dto.classId, subjectId: dto.subjectId } },
    });
    if (existing) throw new ConflictException({ code: 'CLASS_SUBJECT_EXISTS', message: 'Mapel sudah ditugaskan di kelas ini' });

    const cs = await this.prisma.classSubject.create({
      data: { classId: dto.classId, subjectId: dto.subjectId, teacherId: dto.teacherId },
    });
    return { id: cs.id };
  }

  async updateClassSubject(userId: string, csId: string, dto: UpdateClassSubjectDto) {
    const admin = await this.getAdmin(userId);
    const cs = await this.prisma.classSubject.findUnique({
      where: { id: csId },
      include: { class: true },
    });
    if (!cs || cs.class.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'CLASS_SUBJECT_NOT_FOUND', message: 'Kelas-mapel tidak ditemukan' });
    }
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: dto.teacherId },
      include: { user: true },
    });
    if (!teacher || teacher.user.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'TEACHER_NOT_FOUND', message: 'Guru tidak ditemukan' });
    }
    await this.prisma.classSubject.update({ where: { id: csId }, data: { teacherId: dto.teacherId } });
  }

  async deleteClassSubject(userId: string, csId: string) {
    const admin = await this.getAdmin(userId);
    const cs = await this.prisma.classSubject.findUnique({
      where: { id: csId },
      include: {
        class: true,
        _count: { select: { assignments: true, quizzes: true } },
      },
    });
    if (!cs || cs.class.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'CLASS_SUBJECT_NOT_FOUND', message: 'Kelas-mapel tidak ditemukan' });
    }
    if (cs._count.assignments > 0 || cs._count.quizzes > 0) {
      throw new ConflictException({ code: 'CLASS_SUBJECT_IN_USE', message: 'Kelas-mapel masih memiliki tugas atau quiz' });
    }
    await this.prisma.classSubject.delete({ where: { id: csId } });
  }

  // ── Schedule ───────────────────────────────────────────────────────────────

  async getSchedule(userId: string, classId?: string) {
    const admin = await this.getAdmin(userId);
    const where: any = { class: { schoolId: admin.user.schoolId } };
    if (classId) where.classId = classId;

    const slots = await this.prisma.scheduleSlot.findMany({
      where,
      include: {
        class: true,
        subject: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeStart: 'asc' }],
    });

    return slots.map(s => ({
      id: s.id,
      class: { id: s.classId, name: s.class.name },
      subject: { id: s.subjectId, name: s.subject.name, color: s.subject.color.toLowerCase() },
      dayOfWeek: s.dayOfWeek,
      timeStart: s.timeStart,
      timeEnd: s.timeEnd,
      room: s.room,
    }));
  }

  async createScheduleSlot(userId: string, dto: CreateScheduleSlotDto) {
    const admin = await this.getAdmin(userId);
    const schoolId = admin.user.schoolId;

    const [cls, subject] = await Promise.all([
      this.prisma.class.findUnique({ where: { id: dto.classId } }),
      this.prisma.subject.findUnique({ where: { id: dto.subjectId } }),
    ]);
    if (!cls || cls.schoolId !== schoolId) throw new NotFoundException({ code: 'CLASS_NOT_FOUND', message: 'Kelas tidak ditemukan' });
    if (!subject || subject.schoolId !== schoolId) throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND', message: 'Mapel tidak ditemukan' });

    const slot = await this.prisma.scheduleSlot.create({ data: dto });
    return { id: slot.id };
  }

  async updateScheduleSlot(userId: string, slotId: string, dto: UpdateScheduleSlotDto) {
    const admin = await this.getAdmin(userId);
    const slot = await this.prisma.scheduleSlot.findUnique({
      where: { id: slotId },
      include: { class: true },
    });
    if (!slot || slot.class.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'SLOT_NOT_FOUND', message: 'Slot jadwal tidak ditemukan' });
    }
    await this.prisma.scheduleSlot.update({ where: { id: slotId }, data: dto });
  }

  async deleteScheduleSlot(userId: string, slotId: string) {
    const admin = await this.getAdmin(userId);
    const slot = await this.prisma.scheduleSlot.findUnique({
      where: { id: slotId },
      include: { class: true },
    });
    if (!slot || slot.class.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'SLOT_NOT_FOUND', message: 'Slot jadwal tidak ditemukan' });
    }
    await this.prisma.scheduleSlot.delete({ where: { id: slotId } });
  }

  // ── Chapters ───────────────────────────────────────────────────────────────

  async getChapters(userId: string, subjectId: string) {
    const admin = await this.getAdmin(userId);
    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject || subject.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND', message: 'Mapel tidak ditemukan' });
    }

    const chapters = await this.prisma.chapter.findMany({
      where: { subjectId },
      orderBy: { order: 'asc' },
    });

    return chapters.map(c => ({
      id: c.id,
      order: c.order,
      title: c.title,
      hasContent: !!c.content,
    }));
  }

  async createChapter(userId: string, subjectId: string, dto: CreateChapterDto) {
    const admin = await this.getAdmin(userId);
    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject || subject.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND', message: 'Mapel tidak ditemukan' });
    }

    const existing = await this.prisma.chapter.findUnique({
      where: { subjectId_order: { subjectId, order: dto.order } },
    });
    if (existing) throw new ConflictException({ code: 'ORDER_TAKEN', message: 'Nomor urut bab sudah ada' });

    const chapter = await this.prisma.chapter.create({
      data: { subjectId, order: dto.order, title: dto.title, content: dto.content },
    });
    return { id: chapter.id, order: chapter.order, title: chapter.title };
  }

  async updateChapter(userId: string, subjectId: string, chapterId: string, dto: UpdateChapterDto) {
    const admin = await this.getAdmin(userId);
    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject || subject.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND', message: 'Mapel tidak ditemukan' });
    }
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter || chapter.subjectId !== subjectId) {
      throw new NotFoundException({ code: 'CHAPTER_NOT_FOUND', message: 'Bab tidak ditemukan' });
    }
    await this.prisma.chapter.update({ where: { id: chapterId }, data: dto });
  }

  async deleteChapter(userId: string, subjectId: string, chapterId: string) {
    const admin = await this.getAdmin(userId);
    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject || subject.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'SUBJECT_NOT_FOUND', message: 'Mapel tidak ditemukan' });
    }
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter || chapter.subjectId !== subjectId) {
      throw new NotFoundException({ code: 'CHAPTER_NOT_FOUND', message: 'Bab tidak ditemukan' });
    }
    await this.prisma.chapter.delete({ where: { id: chapterId } });
  }

  // ── Class Detail ───────────────────────────────────────────────────────────

  async getClassDetail(userId: string, classId: string) {
    const admin = await this.getAdmin(userId);
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
            _count: { select: { assignments: true, quizzes: true } },
          },
        },
      },
    });
    if (!cls || cls.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'CLASS_NOT_FOUND', message: 'Kelas tidak ditemukan' });
    }

    return {
      id: cls.id,
      name: cls.name,
      gradeYear: cls.gradeYear,
      students: cls.students.map(s => ({
        id: s.userId,
        name: s.name,
        nis: s.nis,
        email: s.user.email,
        isActive: s.user.isActive,
        level: s.level,
        xp: s.xp,
      })),
      classSubjects: cls.classSubjects.map(cs => ({
        id: cs.id,
        subject: { ...cs.subject, color: cs.subject.color.toLowerCase() },
        teacher: cs.teacher,
        assignmentCount: cs._count.assignments,
        quizCount: cs._count.quizzes,
      })),
    };
  }

  // ── Assignments (admin) ────────────────────────────────────────────────────

  async getClassSubjectAssignments(userId: string, csId: string) {
    const admin = await this.getAdmin(userId);
    const cs = await this.prisma.classSubject.findUnique({
      where: { id: csId },
      include: { class: true },
    });
    if (!cs || cs.class.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'CLASS_SUBJECT_NOT_FOUND', message: 'Kelas-mapel tidak ditemukan' });
    }

    const assignments = await this.prisma.assignment.findMany({
      where: { classSubjectId: csId },
      include: { _count: { select: { submissions: true } } },
      orderBy: { dueAt: 'desc' },
    });

    return assignments.map(a => ({
      id: a.id,
      title: a.title,
      type: a.type,
      dueAt: a.dueAt,
      maxScore: a.maxScore,
      submissionCount: a._count.submissions,
      createdAt: a.createdAt,
    }));
  }

  async deleteAssignment(userId: string, assignmentId: string) {
    const admin = await this.getAdmin(userId);
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        classSubject: { class: { schoolId: admin.user.schoolId } },
      },
    });
    if (!assignment) {
      throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Tugas tidak ditemukan' });
    }
    await this.prisma.assignment.delete({ where: { id: assignmentId } });
  }

  // ── Quizzes (admin) ────────────────────────────────────────────────────────

  async getClassSubjectQuizzes(userId: string, csId: string) {
    const admin = await this.getAdmin(userId);
    const cs = await this.prisma.classSubject.findUnique({
      where: { id: csId },
      include: { class: true },
    });
    if (!cs || cs.class.schoolId !== admin.user.schoolId) {
      throw new NotFoundException({ code: 'CLASS_SUBJECT_NOT_FOUND', message: 'Kelas-mapel tidak ditemukan' });
    }

    const quizzes = await this.prisma.quiz.findMany({
      where: { classSubjectId: csId },
      include: { _count: { select: { sessions: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return quizzes.map(q => ({
      id: q.id,
      title: q.title,
      chapter: q.chapter,
      durationMinutes: q.durationMinutes,
      totalQuestions: q.totalQuestions,
      maxAttempts: q.maxAttempts,
      sessionCount: q._count.sessions,
      createdAt: q.createdAt,
    }));
  }

  async deleteQuiz(userId: string, quizId: string) {
    const admin = await this.getAdmin(userId);
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id: quizId,
        classSubject: { class: { schoolId: admin.user.schoolId } },
      },
    });
    if (!quiz) {
      throw new NotFoundException({ code: 'QUIZ_NOT_FOUND', message: 'Quiz tidak ditemukan' });
    }
    await this.prisma.quiz.delete({ where: { id: quizId } });
  }
}
