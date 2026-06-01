import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function encodeCursor(date: Date): string {
  return Buffer.from(date.toISOString()).toString('base64url');
}

function decodeCursor(cursor: string): Date {
  return new Date(Buffer.from(cursor, 'base64url').toString());
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getNotifications(userId: string, unreadOnly = false, cursor?: string, limit = 20) {
    const take = Math.min(limit, 50);
    const where: any = { userId };
    if (unreadOnly) where.readAt = null;
    if (cursor) where.createdAt = { lt: decodeCursor(cursor) };

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        take: take + 1,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    const hasMore = notifications.length > take;
    const items = hasMore ? notifications.slice(0, take) : notifications;

    return {
      items: items.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        linkTo: n.linkTo,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      nextCursor: hasMore ? encodeCursor(items[items.length - 1].createdAt) : null,
      unreadCount,
    };
  }

  async markRead(userId: string, notifId: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id: notifId } });
    if (!notif || notif.userId !== userId) {
      throw new NotFoundException({ code: 'NOTIF_NOT_FOUND', message: 'Notifikasi tidak ditemukan' });
    }
    await this.prisma.notification.update({ where: { id: notifId }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
