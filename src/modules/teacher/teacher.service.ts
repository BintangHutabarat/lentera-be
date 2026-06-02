import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';

@Injectable()
export class TeacherService {
  constructor(private prisma: PrismaService) {}

  private async getTeacher(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      include: { user: { include: { school: true } } },
    });
    if (!teacher) throw new NotFoundException({ code: 'TEACHER_NOT_FOUND', message: 'Guru tidak ditemukan' });
    return teacher;
  }

  private async assertOwnsClassSubject(teacherId: string, classSubjectId: string) {
    const cs = await this.prisma.classSubject.findUnique({ where: { id: classSubjectId } });
    if (!cs) throw new NotFoundException({ code: 'CLASS_SUBJECT_NOT_FOUND', message: 'Kelas-mapel tidak ditemukan' });
    if (cs.teacherId !== teacherId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Akses ditolak' });
    return cs;
  }

  private async assertOwnsAssignment(teacherId: string, assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { classSubject: true },
    });
    if (!assignment) throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Tugas tidak ditemukan' });
    if (assignment.classSubject.teacherId !== teacherId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Akses ditolak' });
    }
    return assignment;
  }

  private async assertOwnsQuiz(teacherId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { classSubject: true },
    });
    if (!quiz) throw new NotFoundException({ code: 'QUIZ_NOT_FOUND', message: 'Quiz tidak ditemukan' });
    if (quiz.classSubject.teacherId !== teacherId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Akses ditolak' });
    }
    return quiz;
  }

  private async notifyClassStudents(
    classSubjectId: string,
    notification: { type: NotificationType; title: string; body: string; linkTo: string },
  ) {
    const cs = await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: { class: { include: { students: true } } },
    });
    if (!cs) return;
    await this.prisma.notification
      .createMany({
        data: cs.class.students.map(s => ({ userId: s.userId, ...notification })),
      })
      .catch(() => null);
  }

  // ── Profile & Subjects ─────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const teacher = await this.getTeacher(userId);
    return {
      id: teacher.userId,
      name: teacher.name,
      nip: teacher.nip,
      title: teacher.title,
      email: teacher.user.email,
      avatar: teacher.avatar,
      school: {
        id: teacher.user.school.id,
        name: teacher.user.school.name,
        code: teacher.user.school.code,
      },
    };
  }

  async getSubjects(userId: string) {
    await this.getTeacher(userId);
    const classSubjects = await this.prisma.classSubject.findMany({
      where: { teacherId: userId },
      include: {
        class: true,
        subject: true,
        _count: { select: { assignments: true, quizzes: true } },
      },
    });

    return classSubjects.map(cs => ({
      id: cs.id,
      class: { id: cs.classId, name: cs.class.name, gradeYear: cs.class.gradeYear },
      subject: {
        id: cs.subjectId,
        name: cs.subject.name,
        color: cs.subject.color.toLowerCase(),
        iconKey: cs.subject.iconKey,
      },
      assignmentCount: cs._count.assignments,
      quizCount: cs._count.quizzes,
    }));
  }

  async getStudents(userId: string, classSubjectId: string) {
    const cs = await this.assertOwnsClassSubject(userId, classSubjectId);
    const students = await this.prisma.student.findMany({
      where: { classId: cs.classId },
      orderBy: { name: 'asc' },
    });

    return students.map(s => ({
      id: s.userId,
      name: s.name,
      nis: s.nis,
      level: s.level,
      xp: s.xp,
      avatar: s.avatar,
    }));
  }

  // ── Assignments ────────────────────────────────────────────────────────────

  async getAssignments(userId: string, classSubjectId?: string) {
    await this.getTeacher(userId);
    const where: any = { classSubject: { teacherId: userId } };
    if (classSubjectId) where.classSubjectId = classSubjectId;

    const assignments = await this.prisma.assignment.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      include: {
        classSubject: { include: { class: true, subject: true } },
        _count: { select: { submissions: true } },
      },
    });

    return assignments.map(a => ({
      id: a.id,
      title: a.title,
      type: a.type,
      maxScore: a.maxScore,
      dueAt: a.dueAt,
      classSubject: {
        id: a.classSubjectId,
        class: a.classSubject.class.name,
        subject: {
          name: a.classSubject.subject.name,
          color: a.classSubject.subject.color.toLowerCase(),
        },
      },
      submissionCount: a._count.submissions,
      createdAt: a.createdAt,
    }));
  }

  async createAssignment(userId: string, dto: CreateAssignmentDto) {
    await this.assertOwnsClassSubject(userId, dto.classSubjectId);

    const assignment = await this.prisma.assignment.create({
      data: {
        classSubjectId: dto.classSubjectId,
        title: dto.title,
        description: dto.description,
        instructions: dto.instructions,
        type: dto.type,
        maxScore: dto.maxScore ?? 100,
        totalItems: dto.totalItems,
        minWords: dto.minWords,
        attachmentUrl: dto.attachmentUrl,
        attachmentName: dto.attachmentName,
        attachmentSize: dto.attachmentSize,
        rubric: dto.rubric as any,
        dueAt: new Date(dto.dueAt),
        createdById: userId,
      },
    });

    await this.notifyClassStudents(dto.classSubjectId, {
      type: 'ASSIGNMENT_NEW',
      title: 'Tugas baru tersedia',
      body: dto.title,
      linkTo: `/student/assignments/${assignment.id}`,
    });

    return { id: assignment.id, createdAt: assignment.createdAt };
  }

  async getAssignment(userId: string, id: string) {
    const assignment = await this.assertOwnsAssignment(userId, id);
    const full = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        classSubject: { include: { class: true, subject: true } },
        _count: { select: { submissions: true } },
      },
    });

    return {
      id: full!.id,
      title: full!.title,
      description: full!.description,
      instructions: full!.instructions as string[],
      type: full!.type,
      maxScore: full!.maxScore,
      totalItems: full!.totalItems,
      minWords: full!.minWords,
      attachment: full!.attachmentUrl
        ? {
            name: full!.attachmentName,
            sizeKB: full!.attachmentSize ? Math.round(full!.attachmentSize / 1024) : null,
            url: full!.attachmentUrl,
          }
        : null,
      rubric: full!.rubric as { label: string; max: number }[],
      dueAt: full!.dueAt,
      classSubject: {
        id: full!.classSubjectId,
        class: full!.classSubject.class.name,
        subject: {
          name: full!.classSubject.subject.name,
          color: full!.classSubject.subject.color.toLowerCase(),
        },
      },
      submissionCount: full!._count.submissions,
      createdAt: full!.createdAt,
    };
  }

  async updateAssignment(userId: string, id: string, dto: UpdateAssignmentDto) {
    await this.assertOwnsAssignment(userId, id);

    const data: Record<string, any> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.instructions !== undefined) data.instructions = dto.instructions;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.maxScore !== undefined) data.maxScore = dto.maxScore;
    if (dto.totalItems !== undefined) data.totalItems = dto.totalItems;
    if (dto.minWords !== undefined) data.minWords = dto.minWords;
    if (dto.attachmentUrl !== undefined) data.attachmentUrl = dto.attachmentUrl;
    if (dto.attachmentName !== undefined) data.attachmentName = dto.attachmentName;
    if (dto.attachmentSize !== undefined) data.attachmentSize = dto.attachmentSize;
    if (dto.rubric !== undefined) data.rubric = dto.rubric;
    if (dto.dueAt !== undefined) data.dueAt = new Date(dto.dueAt);

    await this.prisma.assignment.update({ where: { id }, data });
  }

  async deleteAssignment(userId: string, id: string) {
    await this.assertOwnsAssignment(userId, id);

    const submissionCount = await this.prisma.assignmentSubmission.count({ where: { assignmentId: id } });
    if (submissionCount > 0) {
      throw new ConflictException({
        code: 'HAS_SUBMISSIONS',
        message: 'Tugas tidak bisa dihapus karena sudah ada pengumpulan dari siswa',
      });
    }

    await this.prisma.assignment.delete({ where: { id } });
  }

  // ── Submissions ────────────────────────────────────────────────────────────

  async getSubmissions(userId: string, assignmentId: string) {
    const assignment = await this.assertOwnsAssignment(userId, assignmentId);

    const [students, submissions] = await Promise.all([
      this.prisma.student.findMany({
        where: { classId: assignment.classSubject.classId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.assignmentSubmission.findMany({ where: { assignmentId } }),
    ]);

    const subMap = new Map(submissions.map(s => [s.studentId, s]));

    return students.map(student => {
      const sub = subMap.get(student.userId);
      return {
        student: { id: student.userId, name: student.name, nis: student.nis },
        submitted: !!sub,
        submittedAt: sub?.submittedAt ?? null,
        score: sub?.score ?? null,
        graded: sub ? sub.gradedAt !== null : false,
      };
    });
  }

  async getSubmission(userId: string, assignmentId: string, studentId: string) {
    await this.assertOwnsAssignment(userId, assignmentId);

    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      include: { student: true },
    });
    if (!submission) {
      throw new NotFoundException({ code: 'SUBMISSION_NOT_FOUND', message: 'Pengumpulan tidak ditemukan' });
    }

    return {
      student: { id: submission.studentId, name: submission.student.name, nis: submission.student.nis },
      kind: submission.kind,
      fileName: submission.fileName,
      fileSizeKB: submission.fileSize ? Math.round(submission.fileSize / 1024) : null,
      fileUrl: submission.fileUrl,
      essayText: submission.essayText,
      answers: submission.answers,
      note: submission.noteFromStudent,
      submittedAt: submission.submittedAt,
      score: submission.score,
      feedback: submission.feedback,
      rubricBreakdown: submission.rubricBreakdown as object[] | null,
      gradedAt: submission.gradedAt,
    };
  }

  async gradeSubmission(
    userId: string,
    assignmentId: string,
    studentId: string,
    dto: GradeSubmissionDto,
  ) {
    const assignment = await this.assertOwnsAssignment(userId, assignmentId);

    if (dto.score > assignment.maxScore) {
      throw new BadRequestException({
        code: 'SCORE_EXCEEDS_MAX',
        message: `Nilai maksimal adalah ${assignment.maxScore}`,
      });
    }

    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });
    if (!submission) {
      throw new NotFoundException({ code: 'SUBMISSION_NOT_FOUND', message: 'Pengumpulan tidak ditemukan' });
    }

    await this.prisma.assignmentSubmission.update({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      data: {
        score: dto.score,
        feedback: dto.feedback,
        rubricBreakdown: (dto.rubricBreakdown ?? undefined) as any,
        gradedAt: new Date(),
        gradedById: userId,
      },
    });

    await this.prisma.notification
      .create({
        data: {
          userId: studentId,
          type: 'ASSIGNMENT_GRADED',
          title: 'Tugas kamu sudah dinilai',
          body: `${assignment.title} mendapat nilai ${dto.score}`,
          linkTo: `/student/assignments/${assignmentId}`,
        },
      })
      .catch(() => null);
  }

  // ── Quizzes ────────────────────────────────────────────────────────────────

  async getQuizzes(userId: string, classSubjectId?: string) {
    await this.getTeacher(userId);
    const where: any = { classSubject: { teacherId: userId } };
    if (classSubjectId) where.classSubjectId = classSubjectId;

    const quizzes = await this.prisma.quiz.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        classSubject: { include: { class: true, subject: true } },
        _count: { select: { sessions: { where: { submittedAt: { not: null } } } } },
      },
    });

    return quizzes.map(q => ({
      id: q.id,
      title: q.title,
      chapter: q.chapter,
      durationMinutes: q.durationMinutes,
      totalQuestions: q.totalQuestions,
      classSubject: {
        id: q.classSubjectId,
        class: q.classSubject.class.name,
        subject: {
          name: q.classSubject.subject.name,
          color: q.classSubject.subject.color.toLowerCase(),
        },
      },
      completedSessionCount: q._count.sessions,
      createdAt: q.createdAt,
    }));
  }

  async createQuiz(userId: string, dto: CreateQuizDto) {
    await this.assertOwnsClassSubject(userId, dto.classSubjectId);

    const quiz = await this.prisma.quiz.create({
      data: {
        classSubjectId: dto.classSubjectId,
        title: dto.title,
        chapter: dto.chapter,
        durationMinutes: dto.durationMinutes,
        totalQuestions: dto.questions.length,
        maxAttempts: dto.maxAttempts ?? 1,
        createdById: userId,
        questions: {
          create: dto.questions.map((q, i) => ({
            order: q.order ?? i + 1,
            text: q.text,
            options: q.options as any,
            correctOptionId: q.correctOptionId,
            explanation: q.explanation,
          })),
        },
      } as any,
    });

    await this.notifyClassStudents(dto.classSubjectId, {
      type: 'QUIZ_NEW',
      title: 'Quiz baru tersedia',
      body: dto.title,
      linkTo: `/student/quizzes/${quiz.id}`,
    });

    return { id: quiz.id, createdAt: quiz.createdAt };
  }

  async getQuiz(userId: string, id: string) {
    await this.assertOwnsQuiz(userId, id);

    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        classSubject: { include: { class: true, subject: true } },
        questions: { orderBy: { order: 'asc' } },
      },
    });

    return {
      id: quiz!.id,
      title: quiz!.title,
      chapter: quiz!.chapter,
      durationMinutes: quiz!.durationMinutes,
      totalQuestions: quiz!.totalQuestions,
      classSubject: {
        id: quiz!.classSubjectId,
        class: quiz!.classSubject.class.name,
        subject: {
          name: quiz!.classSubject.subject.name,
          color: quiz!.classSubject.subject.color.toLowerCase(),
        },
      },
      questions: quiz!.questions.map(q => ({
        id: q.id,
        order: q.order,
        text: q.text,
        options: q.options,
        correctOptionId: q.correctOptionId,
        explanation: q.explanation,
      })),
      createdAt: quiz!.createdAt,
    };
  }

  async updateQuiz(userId: string, id: string, dto: UpdateQuizDto) {
    await this.assertOwnsQuiz(userId, id);

    const data: Record<string, any> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.chapter !== undefined) data.chapter = dto.chapter;
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes;
    if (dto.maxAttempts !== undefined) data.maxAttempts = dto.maxAttempts;

    if (dto.questions !== undefined) {
      await this.prisma.quizQuestion.deleteMany({ where: { quizId: id } });
      await this.prisma.quizQuestion.createMany({
        data: dto.questions.map((q, i) => ({
          quizId: id,
          order: q.order ?? i + 1,
          text: q.text,
          options: q.options as any,
          correctOptionId: q.correctOptionId,
          explanation: q.explanation,
        })),
      });
      data.totalQuestions = dto.questions.length;
    }

    await this.prisma.quiz.update({ where: { id }, data });
  }

  async deleteQuiz(userId: string, id: string) {
    const quiz = await this.assertOwnsQuiz(userId, id);

    const sessionCount = await this.prisma.quizSession.count({
      where: { quizId: id, submittedAt: { not: null } },
    });
    if (sessionCount > 0) {
      throw new ConflictException({
        code: 'HAS_SESSIONS',
        message: 'Quiz tidak bisa dihapus karena sudah ada siswa yang mengerjakan',
      });
    }

    await this.prisma.quizSession.deleteMany({ where: { quizId: id } });
    await this.prisma.quizQuestion.deleteMany({ where: { quizId: id } });
    await this.prisma.quiz.delete({ where: { id } });
  }

  async createAnnouncement(userId: string, classSubjectId: string, title: string, body: string) {
    await this.assertOwnsClassSubject(userId, classSubjectId);
    await this.notifyClassStudents(classSubjectId, {
      type: 'ANNOUNCEMENT',
      title,
      body,
      linkTo: '',
    });
  }

  async getStudentProgress(userId: string, classSubjectId: string, studentId: string) {
    const cs = await this.assertOwnsClassSubject(userId, classSubjectId);

    const [assignments, quizzes, chapters] = await Promise.all([
      this.prisma.assignment.findMany({ where: { classSubjectId }, orderBy: { dueAt: 'asc' } }),
      this.prisma.quiz.findMany({ where: { classSubjectId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.chapter.findMany({
        where: { subject: { classOffers: { some: { id: classSubjectId } } } },
        orderBy: { order: 'asc' },
      }),
    ]);

    const assignmentIds = assignments.map(a => a.id);
    const quizIds = quizzes.map(q => q.id);
    const chapterIds = chapters.map(c => c.id);

    const [submissions, sessions, chapterProgress] = await Promise.all([
      this.prisma.assignmentSubmission.findMany({ where: { assignmentId: { in: assignmentIds }, studentId } }),
      this.prisma.quizSession.findMany({ where: { quizId: { in: quizIds }, studentId, submittedAt: { not: null } }, orderBy: { score: 'desc' } }),
      this.prisma.chapterProgress.findMany({ where: { studentId, chapterId: { in: chapterIds } } }),
    ]);

    const subMap = new Map(submissions.map(s => [s.assignmentId, s]));
    const sessionMap = new Map<string, typeof sessions[0]>();
    sessions.forEach(s => { if (!sessionMap.has(s.quizId)) sessionMap.set(s.quizId, s); });

    const progressMap = new Map(chapterProgress.map(p => [p.chapterId, p]));

    return {
      assignments: assignments.map(a => {
        const sub = subMap.get(a.id);
        return { id: a.id, title: a.title, dueAt: a.dueAt, submitted: !!sub, submittedAt: sub?.submittedAt ?? null, score: sub?.score ?? null, graded: sub ? sub.gradedAt !== null : false };
      }),
      quizzes: quizzes.map(q => {
        const session = sessionMap.get(q.id);
        return { id: q.id, title: q.title, attempted: !!session, bestScore: session?.score ?? null, bestStars: session?.stars ?? null };
      }),
      chapters: chapters.map(c => {
        const prog = progressMap.get(c.id);
        return { id: c.id, order: c.order, title: c.title, completed: prog?.completed ?? false };
      }),
    };
  }

  async updateChapterContent(userId: string, classSubjectId: string, chapterId: string, content: string) {
    const cs = await this.assertOwnsClassSubject(userId, classSubjectId);
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { subject: { include: { classOffers: true } } },
    });
    if (!chapter) throw new NotFoundException({ code: 'CHAPTER_NOT_FOUND', message: 'Bab tidak ditemukan' });
    const accessible = chapter.subject.classOffers.some(offer => offer.id === classSubjectId);
    if (!accessible) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Akses ditolak' });
    await this.prisma.chapter.update({ where: { id: chapterId }, data: { content } });
  }

  async getQuizSessions(userId: string, quizId: string) {
    const quiz = await this.assertOwnsQuiz(userId, quizId);

    const [students, sessions] = await Promise.all([
      this.prisma.student.findMany({
        where: { classId: quiz.classSubject.classId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.quizSession.findMany({
        where: { quizId, submittedAt: { not: null } },
      }),
    ]);

    const sessionMap = new Map(sessions.map(s => [s.studentId, s]));

    return students.map(student => {
      const session = sessionMap.get(student.userId);
      return {
        student: { id: student.userId, name: student.name, nis: student.nis },
        attempted: !!session,
        score: session?.score ?? null,
        stars: session?.stars ?? null,
        correctCount: session?.correctCount ?? null,
        submittedAt: session?.submittedAt ?? null,
      };
    });
  }
}
