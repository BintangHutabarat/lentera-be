import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async getSubjectsList(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Siswa tidak ditemukan' });

    const classSubjects = await this.prisma.classSubject.findMany({
      where: { classId: student.classId },
      include: {
        subject: { include: { chapters: { orderBy: { order: 'asc' } } } },
        teacher: true,
      },
    });

    return Promise.all(
      classSubjects.map(async cs => {
        const total = cs.subject.chapters.length;
        const progressRows = await this.prisma.chapterProgress.findMany({
          where: { studentId: userId, chapterId: { in: cs.subject.chapters.map(c => c.id) }, completed: true },
        });
        const done = progressRows.length;
        const currentChapter = cs.subject.chapters.find(
          ch => !progressRows.some(p => p.chapterId === ch.id),
        );

        return {
          id: cs.subject.id,
          name: cs.subject.name,
          color: cs.subject.color.toLowerCase(),
          icon: cs.subject.iconKey,
          teacher: { id: cs.teacherId, name: cs.teacher.name, title: cs.teacher.title },
          chaptersTotal: total,
          chaptersDone: done,
          progress: total ? Math.round((done / total) * 100) : 0,
          currentChapter: currentChapter?.title ?? null,
        };
      }),
    );
  }

  async getSubjectDetail(userId: string, subjectId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Siswa tidak ditemukan' });

    const classSubject = await this.prisma.classSubject.findFirst({
      where: { classId: student.classId, subjectId },
      include: {
        subject: { include: { chapters: { orderBy: { order: 'asc' } } } },
        teacher: true,
      },
    });

    if (!classSubject) {
      throw new ForbiddenException({ code: 'SUBJECT_NOT_ACCESSIBLE', message: 'Mapel tidak tersedia untuk kelas Anda' });
    }

    const progressRows = await this.prisma.chapterProgress.findMany({
      where: { studentId: userId, chapterId: { in: classSubject.subject.chapters.map(c => c.id) } },
    });

    return {
      id: classSubject.subject.id,
      name: classSubject.subject.name,
      color: classSubject.subject.color.toLowerCase(),
      icon: classSubject.subject.iconKey,
      teacher: { id: classSubject.teacherId, name: classSubject.teacher.name },
      chapters: classSubject.subject.chapters.map(ch => {
        const prog = progressRows.find(p => p.chapterId === ch.id);
        return {
          id: ch.id,
          order: ch.order,
          title: ch.title,
          completed: prog?.completed ?? false,
          completedAt: prog?.completedAt ?? null,
        };
      }),
    };
  }

  async getChapterContent(userId: string, subjectId: string, chapterId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Siswa tidak ditemukan' });

    const classSubject = await this.prisma.classSubject.findFirst({
      where: { classId: student.classId, subjectId },
    });
    if (!classSubject) {
      throw new ForbiddenException({ code: 'SUBJECT_NOT_ACCESSIBLE', message: 'Mapel tidak tersedia untuk kelas Anda' });
    }

    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter || chapter.subjectId !== subjectId) {
      throw new NotFoundException({ code: 'CHAPTER_NOT_FOUND', message: 'Bab tidak ditemukan' });
    }

    const progress = await this.prisma.chapterProgress.findUnique({
      where: { studentId_chapterId: { studentId: userId, chapterId } },
    });

    return {
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      content: chapter.content,
      completed: progress?.completed ?? false,
      completedAt: progress?.completedAt ?? null,
    };
  }

  async completeChapter(userId: string, chapterId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Siswa tidak ditemukan' });

    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { subject: { include: { classOffers: true } } },
    });
    if (!chapter) throw new NotFoundException({ code: 'CHAPTER_NOT_FOUND', message: 'Chapter tidak ditemukan' });

    const accessible = chapter.subject.classOffers.some(cs => cs.classId === student.classId);
    if (!accessible) {
      throw new ForbiddenException({ code: 'CHAPTER_NOT_ACCESSIBLE', message: 'Chapter tidak tersedia untuk kelas Anda' });
    }

    await this.prisma.chapterProgress.upsert({
      where: { studentId_chapterId: { studentId: userId, chapterId } },
      update: {},
      create: { studentId: userId, chapterId, completed: true, completedAt: new Date() },
    });
  }
}
