import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceStatus, MeetingStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { UpsertExamGradesDto } from './dto/upsert-exam-grades.dto';
import { UpsertFinalGradesDto } from './dto/upsert-final-grades.dto';

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

  // ── Meetings & Attendance ──────────────────────────────────────────────────

  async getMeetings(userId: string, classSubjectId: string) {
    const teacher = await this.getTeacher(userId);
    const cs = await this.assertOwnsClassSubject(teacher.userId, classSubjectId);
    const meetings = await this.prisma.meeting.findMany({
      where: { classSubjectId },
      orderBy: { meetingNumber: 'asc' },
      include: { _count: { select: { attendances: true } } },
    });
    return {
      totalMeetings: cs.totalMeetings,
      meetings: meetings.map((m) => ({
        id: m.id,
        meetingNumber: m.meetingNumber,
        status: m.status,
        startedAt: m.startedAt,
        endedAt: m.endedAt,
        studentCount: m._count.attendances,
      })),
    };
  }

  async openMeeting(userId: string, classSubjectId: string) {
    const teacher = await this.getTeacher(userId);
    const cs = await this.assertOwnsClassSubject(teacher.userId, classSubjectId);

    const openMeeting = await this.prisma.meeting.findFirst({
      where: { classSubjectId, status: MeetingStatus.OPEN },
    });
    if (openMeeting) {
      throw new ConflictException({
        code: 'MEETING_ALREADY_OPEN',
        message: 'Masih ada pertemuan yang belum ditutup',
      });
    }

    const last = await this.prisma.meeting.findFirst({
      where: { classSubjectId },
      orderBy: { meetingNumber: 'desc' },
    });
    const nextNumber = (last?.meetingNumber ?? 0) + 1;
    if (nextNumber > cs.totalMeetings) {
      throw new ConflictException({
        code: 'MEETING_LIMIT_REACHED',
        message: `Jumlah pertemuan sudah mencapai batas (${cs.totalMeetings})`,
      });
    }

    const students = await this.prisma.student.findMany({
      where: { classId: cs.classId },
      select: { userId: true },
    });

    const meeting = await this.prisma.meeting.create({
      data: {
        classSubjectId,
        meetingNumber: nextNumber,
        attendances: {
          create: students.map((s) => ({ studentId: s.userId })),
        },
      },
    });

    return {
      id: meeting.id,
      meetingNumber: meeting.meetingNumber,
      status: meeting.status,
      startedAt: meeting.startedAt,
      studentCount: students.length,
    };
  }

  async closeMeeting(userId: string, meetingId: string) {
    const teacher = await this.getTeacher(userId);
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { classSubject: true },
    });
    if (!meeting) {
      throw new NotFoundException({ code: 'MEETING_NOT_FOUND', message: 'Pertemuan tidak ditemukan' });
    }
    if (meeting.classSubject.teacherId !== teacher.userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Akses ditolak' });
    }
    if (meeting.status === MeetingStatus.CLOSED) {
      throw new ConflictException({ code: 'MEETING_ALREADY_CLOSED', message: 'Pertemuan sudah ditutup' });
    }
    await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.CLOSED, endedAt: new Date() },
    });
  }

  async getAttendance(userId: string, meetingId: string) {
    const teacher = await this.getTeacher(userId);
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { classSubject: true },
    });
    if (!meeting) {
      throw new NotFoundException({ code: 'MEETING_NOT_FOUND', message: 'Pertemuan tidak ditemukan' });
    }
    if (meeting.classSubject.teacherId !== teacher.userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Akses ditolak' });
    }
    const attendances = await this.prisma.attendance.findMany({
      where: { meetingId },
      include: { student: { select: { userId: true, name: true, nis: true } } },
      orderBy: { student: { name: 'asc' } },
    });
    return {
      meeting: {
        id: meeting.id,
        meetingNumber: meeting.meetingNumber,
        status: meeting.status,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt,
      },
      entries: attendances.map((a) => ({
        studentId: a.student.userId,
        name: a.student.name,
        nis: a.student.nis,
        status: a.status,
      })),
    };
  }

  async updateAttendance(userId: string, meetingId: string, dto: UpdateAttendanceDto) {
    const teacher = await this.getTeacher(userId);
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { classSubject: true },
    });
    if (!meeting) {
      throw new NotFoundException({ code: 'MEETING_NOT_FOUND', message: 'Pertemuan tidak ditemukan' });
    }
    if (meeting.classSubject.teacherId !== teacher.userId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Akses ditolak' });
    }
    if (meeting.status === MeetingStatus.CLOSED) {
      throw new ConflictException({ code: 'MEETING_CLOSED', message: 'Pertemuan sudah ditutup' });
    }

    await this.prisma.$transaction(
      dto.entries.map((e) =>
        this.prisma.attendance.update({
          where: { meetingId_studentId: { meetingId, studentId: e.studentId } },
          data: { status: e.status },
        }),
      ),
    );
  }

  // ── Exams ──────────────────────────────────────────────────────────────────

  private async assertOwnsExam(teacherId: string, examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { classSubject: true },
    });
    if (!exam) throw new NotFoundException({ code: 'EXAM_NOT_FOUND', message: 'Ujian tidak ditemukan' });
    if (exam.classSubject.teacherId !== teacherId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Akses ditolak' });
    }
    return exam;
  }

  async getExams(userId: string, classSubjectId: string) {
    const teacher = await this.getTeacher(userId);
    await this.assertOwnsClassSubject(teacher.userId, classSubjectId);
    const exams = await this.prisma.exam.findMany({
      where: { classSubjectId },
      orderBy: { date: 'desc' },
      include: { _count: { select: { grades: true } } },
    });
    return exams.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      maxScore: e.maxScore,
      date: e.date,
      gradedCount: e._count.grades,
      createdAt: e.createdAt,
    }));
  }

  async createExam(userId: string, classSubjectId: string, dto: CreateExamDto) {
    const teacher = await this.getTeacher(userId);
    await this.assertOwnsClassSubject(teacher.userId, classSubjectId);
    const exam = await this.prisma.exam.create({
      data: {
        classSubjectId,
        title: dto.title,
        description: dto.description,
        maxScore: dto.maxScore ?? 100,
        date: dto.date ? new Date(dto.date) : null,
        createdById: teacher.userId,
      },
    });
    return { id: exam.id };
  }

  async updateExam(userId: string, examId: string, dto: UpdateExamDto) {
    const teacher = await this.getTeacher(userId);
    await this.assertOwnsExam(teacher.userId, examId);
    await this.prisma.exam.update({
      where: { id: examId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.maxScore !== undefined && { maxScore: dto.maxScore }),
        ...(dto.date !== undefined && { date: dto.date ? new Date(dto.date) : null }),
      },
    });
  }

  async deleteExam(userId: string, examId: string) {
    const teacher = await this.getTeacher(userId);
    await this.assertOwnsExam(teacher.userId, examId);
    await this.prisma.exam.delete({ where: { id: examId } });
  }

  async getExamGrades(userId: string, examId: string) {
    const teacher = await this.getTeacher(userId);
    const exam = await this.assertOwnsExam(teacher.userId, examId);

    const [students, grades] = await Promise.all([
      this.prisma.student.findMany({
        where: { classId: exam.classSubject.classId },
        select: { userId: true, name: true, nis: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.examGrade.findMany({ where: { examId } }),
    ]);

    const gradeMap = new Map(grades.map((g) => [g.studentId, g]));

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        maxScore: exam.maxScore,
        date: exam.date,
      },
      entries: students.map((s) => {
        const g = gradeMap.get(s.userId);
        return {
          studentId: s.userId,
          name: s.name,
          nis: s.nis,
          score: g?.score ?? null,
          notes: g?.notes ?? null,
          gradedAt: g?.gradedAt ?? null,
        };
      }),
    };
  }

  async upsertExamGrades(userId: string, examId: string, dto: UpsertExamGradesDto) {
    const teacher = await this.getTeacher(userId);
    const exam = await this.assertOwnsExam(teacher.userId, examId);

    for (const entry of dto.entries) {
      if (entry.score !== null && entry.score !== undefined && entry.score > exam.maxScore) {
        throw new BadRequestException({
          code: 'SCORE_EXCEEDS_MAX',
          message: `Nilai tidak boleh melebihi ${exam.maxScore}`,
        });
      }
    }

    const now = new Date();
    await this.prisma.$transaction(
      dto.entries.map((e) =>
        this.prisma.examGrade.upsert({
          where: { examId_studentId: { examId, studentId: e.studentId } },
          create: {
            examId,
            studentId: e.studentId,
            score: e.score ?? null,
            notes: e.notes ?? null,
            gradedAt: e.score !== null && e.score !== undefined ? now : null,
            gradedById: e.score !== null && e.score !== undefined ? teacher.userId : null,
          },
          update: {
            score: e.score ?? null,
            notes: e.notes ?? null,
            gradedAt: e.score !== null && e.score !== undefined ? now : null,
            gradedById: e.score !== null && e.score !== undefined ? teacher.userId : null,
          },
        }),
      ),
    );
  }

  // ── Final Grades ───────────────────────────────────────────────────────────

  private async computeReferences(classSubjectId: string, classId: string) {
    const [assignments, quizzes, exams, meetings, students] = await Promise.all([
      this.prisma.assignment.findMany({
        where: { classSubjectId },
        select: { id: true, maxScore: true, submissions: { select: { studentId: true, score: true } } },
      }),
      this.prisma.quiz.findMany({
        where: { classSubjectId },
        select: { id: true, sessions: { where: { submittedAt: { not: null } }, select: { studentId: true, score: true } } },
      }),
      this.prisma.exam.findMany({
        where: { classSubjectId },
        select: { id: true, maxScore: true, grades: { select: { studentId: true, score: true } } },
      }),
      this.prisma.meeting.findMany({
        where: { classSubjectId },
        select: { attendances: { select: { studentId: true, status: true } } },
      }),
      this.prisma.student.findMany({
        where: { classId },
        select: { userId: true, name: true, nis: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const refs = new Map<string, { refAssignment: number | null; refQuiz: number | null; refExam: number | null; refAttendance: number | null }>();

    for (const s of students) {
      const aPercents: number[] = [];
      for (const a of assignments) {
        const sub = a.submissions.find((x) => x.studentId === s.userId);
        if (sub?.score != null && a.maxScore > 0) {
          aPercents.push((sub.score / a.maxScore) * 100);
        }
      }
      const qScores: number[] = [];
      for (const q of quizzes) {
        for (const sess of q.sessions) {
          if (sess.studentId === s.userId && sess.score != null) {
            qScores.push(sess.score);
          }
        }
      }
      const ePercents: number[] = [];
      for (const ex of exams) {
        const g = ex.grades.find((x) => x.studentId === s.userId);
        if (g?.score != null && ex.maxScore > 0) {
          ePercents.push((g.score / ex.maxScore) * 100);
        }
      }
      let attendTotal = 0;
      let attendPresent = 0;
      for (const m of meetings) {
        const att = m.attendances.find((x) => x.studentId === s.userId);
        if (att) {
          attendTotal++;
          if (att.status === AttendanceStatus.HADIR) attendPresent++;
        }
      }

      const avg = (arr: number[]) =>
        arr.length === 0 ? null : Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;

      refs.set(s.userId, {
        refAssignment: avg(aPercents),
        refQuiz: avg(qScores),
        refExam: avg(ePercents),
        refAttendance: attendTotal === 0 ? null : Math.round((attendPresent / attendTotal) * 10000) / 100,
      });
    }

    return { students, refs };
  }

  async getFinalGrades(
    userId: string,
    classSubjectId: string,
    academicYearId: string,
    semester: number,
  ) {
    const teacher = await this.getTeacher(userId);
    const cs = await this.assertOwnsClassSubject(teacher.userId, classSubjectId);

    const ay = await this.prisma.academicYear.findUnique({ where: { id: academicYearId } });
    if (!ay || ay.schoolId !== teacher.user.schoolId) {
      throw new NotFoundException({ code: 'ACADEMIC_YEAR_NOT_FOUND', message: 'Tahun ajaran tidak ditemukan' });
    }

    const [{ students, refs }, saved] = await Promise.all([
      this.computeReferences(classSubjectId, cs.classId),
      this.prisma.finalGrade.findMany({
        where: { classSubjectId, academicYearId, semester },
      }),
    ]);

    const savedMap = new Map(saved.map((g) => [g.studentId, g]));

    return {
      classSubjectId,
      academicYearId,
      academicYearLabel: ay.label,
      semester,
      entries: students.map((s) => {
        const ref = refs.get(s.userId)!;
        const fg = savedMap.get(s.userId);
        return {
          studentId: s.userId,
          name: s.name,
          nis: s.nis,
          refAssignment: ref.refAssignment,
          refQuiz: ref.refQuiz,
          refExam: ref.refExam,
          refAttendance: ref.refAttendance,
          finalGrade: fg?.finalGrade ?? null,
          notes: fg?.notes ?? null,
          gradedAt: fg?.gradedAt ?? null,
        };
      }),
    };
  }

  async upsertFinalGrades(userId: string, classSubjectId: string, dto: UpsertFinalGradesDto) {
    const teacher = await this.getTeacher(userId);
    const cs = await this.assertOwnsClassSubject(teacher.userId, classSubjectId);

    const ay = await this.prisma.academicYear.findUnique({ where: { id: dto.academicYearId } });
    if (!ay || ay.schoolId !== teacher.user.schoolId) {
      throw new NotFoundException({ code: 'ACADEMIC_YEAR_NOT_FOUND', message: 'Tahun ajaran tidak ditemukan' });
    }

    const { refs } = await this.computeReferences(classSubjectId, cs.classId);
    const now = new Date();

    await this.prisma.$transaction(
      dto.entries.map((e) => {
        const ref = refs.get(e.studentId) ?? {
          refAssignment: null,
          refQuiz: null,
          refExam: null,
          refAttendance: null,
        };
        const hasGrade = e.finalGrade !== null && e.finalGrade !== undefined;
        return this.prisma.finalGrade.upsert({
          where: {
            classSubjectId_studentId_academicYearId_semester: {
              classSubjectId,
              studentId: e.studentId,
              academicYearId: dto.academicYearId,
              semester: dto.semester,
            },
          },
          create: {
            classSubjectId,
            studentId: e.studentId,
            academicYearId: dto.academicYearId,
            semester: dto.semester,
            refAssignment: ref.refAssignment,
            refQuiz: ref.refQuiz,
            refExam: ref.refExam,
            refAttendance: ref.refAttendance,
            finalGrade: e.finalGrade ?? null,
            notes: e.notes ?? null,
            gradedAt: hasGrade ? now : null,
            gradedById: hasGrade ? teacher.userId : null,
          },
          update: {
            refAssignment: ref.refAssignment,
            refQuiz: ref.refQuiz,
            refExam: ref.refExam,
            refAttendance: ref.refAttendance,
            finalGrade: e.finalGrade ?? null,
            notes: e.notes ?? null,
            gradedAt: hasGrade ? now : null,
            gradedById: hasGrade ? teacher.userId : null,
          },
        });
      }),
    );
  }
}
