import { Injectable, NotFoundException } from '@nestjs/common';
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

  private xpMax(level: number) {
    return 1000 + level * 100;
  }
}
