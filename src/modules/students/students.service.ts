import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { class: true, user: { include: { school: true } } },
    });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Profil tidak ditemukan' });

    return {
      id: student.userId,
      name: student.name,
      nis: student.nis,
      class: { id: student.classId, name: student.class.name, gradeYear: student.class.gradeYear },
      school: { id: student.user.schoolId, name: student.user.school.name, code: student.user.school.code },
      level: student.level,
      xp: student.xp,
      xpMax: this.xpMax(student.level),
      avatar: student.avatar,
    };
  }

  async getStats(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Profil tidak ditemukan' });

    const allSubmissions = await this.prisma.assignmentSubmission.findMany({
      where: { studentId: userId },
      include: { assignment: { include: { classSubject: { include: { class: true } } } } },
    });

    const gradedSubmissions = allSubmissions.filter(s => s.score !== null);
    const avgScore = gradedSubmissions.length
      ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.score ?? 0), 0) / gradedSubmissions.length)
      : 0;

    const totalAssignments = await this.prisma.assignment.count({
      where: { classSubject: { classId: student.classId } },
    });

    return {
      attendance: 92,
      avgScore,
      completedAssignments: {
        done: allSubmissions.length,
        total: totalAssignments,
        percent: totalAssignments ? Math.round((allSubmissions.length / totalAssignments) * 100) : 0,
      },
      weeklyDelta: { avgScore: '+0', completed: '+0' },
    };
  }

  async getMateri(userId: string, subjectId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Profil tidak ditemukan' });

    // FE mengirim subjectId (konsisten dengan /subjects/:id). Pastikan mapel ini diajarkan di kelas siswa.
    const cs = await this.prisma.classSubject.findFirst({
      where: { classId: student.classId, subjectId },
    });
    if (!cs) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Akses ditolak' });

    const items = await this.prisma.materiItem.findMany({
      where: { subjectId: cs.subjectId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { attachments: true } } },
    });
    return items.map(item => ({
      id: item.id,
      title: item.title,
      excerpt: item.body.replace(/<[^>]*>/g, '').trim().slice(0, 150),
      attachmentCount: item._count.attachments,
      createdAt: item.createdAt,
    }));
  }

  async getBadges(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Profil tidak ditemukan' });

    const allBadges = await this.prisma.badge.findMany({
      include: { students: { where: { studentId: userId } } },
    });

    return allBadges.map(b => ({
      id: b.id,
      label: b.label,
      icon: b.iconEmoji,
      earned: b.students.length > 0,
      earnedAt: b.students[0]?.earnedAt ?? null,
    }));
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Profil tidak ditemukan' });
    await this.prisma.student.update({ where: { userId }, data: { avatar: avatarUrl } });
  }

  async getAttendanceByClassSubject(userId: string, subjectId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) {
      throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Profil tidak ditemukan' });
    }
    // FE mengirim subjectId (konsisten dengan /subjects/:id). Resolusi ke class-subject kelas siswa.
    const cs = await this.prisma.classSubject.findFirst({
      where: { classId: student.classId, subjectId },
      include: { subject: { select: { id: true, name: true, shortName: true } } },
    });
    if (!cs) {
      throw new NotFoundException({ code: 'CLASS_SUBJECT_NOT_FOUND', message: 'Kelas-mapel tidak ditemukan' });
    }
    if (cs.classId !== student.classId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Akses ditolak' });
    }

    const meetings = await this.prisma.meeting.findMany({
      where: { classSubjectId: cs.id },
      orderBy: { meetingNumber: 'asc' },
      include: {
        attendances: { where: { studentId: userId }, select: { status: true } },
      },
    });

    let total = 0;
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpha = 0;
    const entries = meetings.map((m) => {
      const status = m.attendances[0]?.status ?? null;
      if (status) {
        total++;
        if (status === AttendanceStatus.HADIR) hadir++;
        else if (status === AttendanceStatus.SAKIT) sakit++;
        else if (status === AttendanceStatus.IZIN) izin++;
        else if (status === AttendanceStatus.ALPHA) alpha++;
      }
      return {
        meetingId: m.id,
        meetingNumber: m.meetingNumber,
        status,
        date: m.startedAt,
        meetingStatus: m.status,
      };
    });

    return {
      classSubjectId: cs.id,
      subject: cs.subject,
      totalMeetings: cs.totalMeetings,
      summary: {
        total,
        hadir,
        sakit,
        izin,
        alpha,
        percentageHadir: total === 0 ? null : Math.round((hadir / total) * 10000) / 100,
      },
      meetings: entries,
    };
  }

  private xpMax(level: number) {
    return 1000 + level * 100;
  }
}
