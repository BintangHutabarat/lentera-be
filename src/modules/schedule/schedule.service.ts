import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DAY_NAMES: Record<number, string> = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday',
};

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  async getToday(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Siswa tidak ditemukan' });

    // ISO weekday: 1=Mon .. 7=Sun (Jakarta time approximation via UTC+7)
    const jakartaNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const dayOfWeek = jakartaNow.getUTCDay() === 0 ? 7 : jakartaNow.getUTCDay();

    const slots = await this.prisma.scheduleSlot.findMany({
      where: { classId: student.classId, dayOfWeek },
      include: { subject: { select: { id: true, name: true, color: true } } },
      orderBy: { timeStart: 'asc' },
    });

    return slots.map(s => ({
      id: s.id,
      subject: { id: s.subject.id, name: s.subject.name, color: s.subject.color.toLowerCase() },
      room: s.room,
      timeStart: s.timeStart,
      timeEnd: s.timeEnd,
    }));
  }

  async getWeek(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Siswa tidak ditemukan' });

    const slots = await this.prisma.scheduleSlot.findMany({
      where: { classId: student.classId },
      include: { subject: { select: { id: true, name: true, color: true } } },
      orderBy: [{ dayOfWeek: 'asc' }, { timeStart: 'asc' }],
    });

    const grouped: Record<string, any[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
    };

    for (const s of slots) {
      const key = DAY_NAMES[s.dayOfWeek];
      if (key && key !== 'sunday') {
        grouped[key].push({
          id: s.id,
          subject: { id: s.subject.id, name: s.subject.name, color: s.subject.color.toLowerCase() },
          room: s.room,
          timeStart: s.timeStart,
          timeEnd: s.timeEnd,
        });
      }
    }

    return grouped;
  }
}
