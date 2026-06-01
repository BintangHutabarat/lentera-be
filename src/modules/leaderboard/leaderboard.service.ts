import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const AVATAR_COLORS = ['#E6F6FD', '#FEF9E7', '#F0FDF4', '#FDF4FF', '#FFF7ED', '#FFF1F2'];

function deriveAvatarColor(userId: string): string {
  let hash = 0;
  for (const c of userId) hash = ((hash * 31) + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function deriveInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getClassLeaderboard(userId: string, limit = 10) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Siswa tidak ditemukan' });

    const take = Math.min(limit, 20);

    const students = await this.prisma.student.findMany({
      where: { classId: student.classId },
      orderBy: { xp: 'desc' },
      take,
    });

    return students.map((s, i) => ({
      rank: i + 1,
      name: s.name,
      initials: deriveInitials(s.name),
      xp: s.xp,
      avatarColor: deriveAvatarColor(s.userId),
      isMe: s.userId === userId,
    }));
  }
}
