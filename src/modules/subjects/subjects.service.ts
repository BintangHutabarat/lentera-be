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
      include: { subject: true, teacher: true },
    });

    const csIds = classSubjects.map(cs => cs.id);

    const [assignments, submissions] = await Promise.all([
      this.prisma.assignment.findMany({
        where: { classSubjectId: { in: csIds } },
        select: { id: true, classSubjectId: true },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: { studentId: userId, assignment: { classSubjectId: { in: csIds } } },
        select: { assignmentId: true },
      }),
    ]);

    const submittedIds = new Set(submissions.map(s => s.assignmentId));

    return classSubjects.map(cs => {
      const csAssignments = assignments.filter(a => a.classSubjectId === cs.id);
      const total = csAssignments.length;
      const done = csAssignments.filter(a => submittedIds.has(a.id)).length;
      return {
        id: cs.subject.id,
        name: cs.subject.name,
        color: cs.subject.color.toLowerCase(),
        icon: cs.subject.iconKey,
        teacher: { id: cs.teacherId, name: cs.teacher.name, title: cs.teacher.title },
        progress: total ? Math.round((done / total) * 100) : 0,
      };
    });
  }

  async getSubjectDetail(userId: string, subjectId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Siswa tidak ditemukan' });

    const classSubject = await this.prisma.classSubject.findFirst({
      where: { classId: student.classId, subjectId },
      include: { subject: true, teacher: true },
    });

    if (!classSubject) {
      throw new ForbiddenException({ code: 'SUBJECT_NOT_ACCESSIBLE', message: 'Mapel tidak tersedia untuk kelas Anda' });
    }

    return {
      id: classSubject.subject.id,
      name: classSubject.subject.name,
      color: classSubject.subject.color.toLowerCase(),
      icon: classSubject.subject.iconKey,
      teacher: { id: classSubject.teacherId, name: classSubject.teacher.name },
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
