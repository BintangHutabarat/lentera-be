import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateReplyDto } from './dto/create-reply.dto';

const AVATAR_COLORS = ['#E6F6FD', '#FEF9E7', '#F0FDF4', '#FDF4FF', '#FFF7ED', '#FFF1F2'];

function deriveAvatarColor(userId: string): string {
  let hash = 0;
  for (const c of userId) hash = ((hash * 31) + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function deriveInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function encodeCursor(date: Date): string {
  return Buffer.from(date.toISOString()).toString('base64url');
}

function decodeCursor(cursor: string): Date {
  return new Date(Buffer.from(cursor, 'base64url').toString());
}

@Injectable()
export class ForumService {
  constructor(private prisma: PrismaService) {}

  private async getStudentCtx(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User tidak ditemukan' });
    return user;
  }

  private get authorInclude() {
    return {
      select: {
        id: true, role: true,
        student: { select: { name: true } },
        teacher: { select: { name: true } },
        admin: { select: { name: true } },
      },
    };
  }

  async getPosts(userId: string, cursor?: string, limit = 20, subject?: string) {
    const user = await this.getStudentCtx(userId);
    const take = Math.min(limit, 50);

    const where: any = { schoolId: user.schoolId };
    if (subject && subject !== 'umum') where.subjectId = subject;
    if (cursor) where.createdAt = { lt: decodeCursor(cursor) };

    const posts = await this.prisma.forumPost.findMany({
      where,
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        author: this.authorInclude,
        subject: { select: { id: true, name: true, color: true } },
        _count: { select: { likes: true, replies: true } },
        likes: { where: { userId } },
        saves: { where: { userId } },
      },
    });

    const hasMore = posts.length > take;
    const items = hasMore ? posts.slice(0, take) : posts;

    return {
      items: items.map(p => this.formatPost(p, userId)),
      nextCursor: hasMore ? encodeCursor(items[items.length - 1].createdAt) : null,
    };
  }

  async createPost(userId: string, dto: CreatePostDto) {
    const user = await this.getStudentCtx(userId);

    if (dto.subjectId) {
      const student = await this.prisma.student.findUnique({ where: { userId } });
      if (student) {
        const accessible = await this.prisma.classSubject.findFirst({
          where: { classId: student.classId, subjectId: dto.subjectId },
        });
        if (!accessible) {
          throw new BadRequestException({ code: 'SUBJECT_NOT_ACCESSIBLE', message: 'Mapel tidak tersedia untuk Anda' });
        }
      }
    }

    const post = await this.prisma.forumPost.create({
      data: {
        schoolId: user.schoolId,
        authorId: userId,
        content: dto.content,
        subjectId: dto.subjectId,
      },
      include: {
        author: this.authorInclude,
        subject: { select: { id: true, name: true, color: true } },
        _count: { select: { likes: true, replies: true } },
        likes: { where: { userId } },
        saves: { where: { userId } },
      },
    });

    return this.formatPost(post, userId);
  }

  async getPost(userId: string, postId: string) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        author: this.authorInclude,
        subject: { select: { id: true, name: true, color: true } },
        _count: { select: { likes: true, replies: true } },
        likes: { where: { userId } },
        saves: { where: { userId } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { author: this.authorInclude },
        },
      },
    });

    if (!post) throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Post tidak ditemukan' });

    return {
      post: this.formatPost(post, userId),
      replies: post.replies.map(r => ({
        id: r.id,
        author: this.formatAuthor(r.author),
        content: r.content,
        createdAt: r.createdAt,
      })),
    };
  }

  async addReply(userId: string, postId: string, dto: CreateReplyDto) {
    const post = await this.prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Post tidak ditemukan' });

    const reply = await this.prisma.forumReply.create({
      data: { postId, authorId: userId, content: dto.content },
      include: { author: this.authorInclude },
    });

    if (post.authorId !== userId) {
      await this.prisma.notification.create({
        data: {
          userId: post.authorId,
          type: 'FORUM_REPLY',
          title: 'Ada balasan di postingan Anda',
          body: dto.content.slice(0, 100),
          linkTo: `/student/forum/${postId}`,
        },
      }).catch(() => null);
    }

    return {
      id: reply.id,
      author: this.formatAuthor(reply.author),
      content: reply.content,
      createdAt: reply.createdAt,
    };
  }

  async like(userId: string, postId: string) {
    const post = await this.prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Post tidak ditemukan' });
    await this.prisma.forumLike.upsert({
      where: { postId_userId: { postId, userId } },
      update: {},
      create: { postId, userId },
    });
  }

  async unlike(userId: string, postId: string) {
    await this.prisma.forumLike.deleteMany({ where: { postId, userId } });
  }

  async save(userId: string, postId: string) {
    const post = await this.prisma.forumPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException({ code: 'POST_NOT_FOUND', message: 'Post tidak ditemukan' });
    await this.prisma.forumSave.upsert({
      where: { postId_userId: { postId, userId } },
      update: {},
      create: { postId, userId },
    });
  }

  async unsave(userId: string, postId: string) {
    await this.prisma.forumSave.deleteMany({ where: { postId, userId } });
  }

  async getSavedPosts(userId: string, cursor?: string, limit = 20) {
    const user = await this.getStudentCtx(userId);
    const take = Math.min(limit, 50);

    const saves = await this.prisma.forumSave.findMany({
      where: { userId },
      take: take + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          include: {
            author: this.authorInclude,
            subject: { select: { id: true, name: true, color: true } },
            _count: { select: { likes: true, replies: true } },
            likes: { where: { userId } },
            saves: { where: { userId } },
          },
        },
      },
    });

    const hasMore = saves.length > take;
    const items = hasMore ? saves.slice(0, take) : saves;

    return {
      items: items.map(s => this.formatPost(s.post, userId)),
      nextCursor: hasMore ? encodeCursor(items[items.length - 1].createdAt) : null,
    };
  }

  private formatAuthor(user: any) {
    const name: string = user.student?.name ?? user.teacher?.name ?? user.admin?.name ?? 'Unknown';
    return {
      id: user.id,
      name,
      initials: deriveInitials(name),
      role: user.role,
      avatarColor: deriveAvatarColor(user.id),
    };
  }

  private formatPost(post: any, userId: string) {
    return {
      id: post.id,
      author: this.formatAuthor(post.author),
      subject: post.subject
        ? { id: post.subject.id, name: post.subject.name, color: post.subject.color.toLowerCase() }
        : null,
      content: post.content,
      createdAt: post.createdAt,
      likeCount: post._count.likes,
      replyCount: post._count.replies,
      likedByMe: post.likes.length > 0,
      savedByMe: post.saves.length > 0,
      isPinned: post.isPinned,
    };
  }
}
