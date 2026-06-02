import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsCron {
  private readonly logger = new Logger(NotificationsCron.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sendDueSoonNotifications() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const assignments = await this.prisma.assignment.findMany({
      where: {
        dueAt: { gte: now, lte: in24h },
      },
      include: {
        classSubject: {
          include: { class: { include: { students: true } } },
        },
        submissions: { select: { studentId: true } },
      },
    });

    let sent = 0;
    for (const assignment of assignments) {
      const submittedIds = new Set(assignment.submissions.map(s => s.studentId));
      const pendingStudents = assignment.classSubject.class.students.filter(
        s => !submittedIds.has(s.userId),
      );

      for (const student of pendingStudents) {
        const alreadyNotified = await this.prisma.notification.findFirst({
          where: {
            userId: student.userId,
            type: 'ASSIGNMENT_DUE_SOON',
            linkTo: `/student/assignments/${assignment.id}`,
            createdAt: { gte: new Date(now.getTime() - 25 * 60 * 60 * 1000) },
          },
        });
        if (alreadyNotified) continue;

        await this.prisma.notification
          .create({
            data: {
              userId: student.userId,
              type: 'ASSIGNMENT_DUE_SOON',
              title: 'Deadline tugas hampir tiba',
              body: `${assignment.title} harus dikumpulkan sebelum ${assignment.dueAt.toLocaleString('id-ID')}`,
              linkTo: `/student/assignments/${assignment.id}`,
            },
          })
          .catch(() => null);
        sent++;
      }
    }

    if (sent > 0) {
      this.logger.log(`Due-soon notifications sent: ${sent}`);
    }
  }
}
