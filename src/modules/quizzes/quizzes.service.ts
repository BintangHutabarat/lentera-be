import {
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  async getQuizzes(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Siswa tidak ditemukan' });

    const classSubjects = await this.prisma.classSubject.findMany({
      where: { classId: student.classId },
      select: { id: true, subject: { select: { id: true, name: true, color: true } } },
    });

    const csIds = classSubjects.map(cs => cs.id);
    const quizzes = await this.prisma.quiz.findMany({
      where: { classSubjectId: { in: csIds } },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      quizzes.map(async q => {
        const sessions = await this.prisma.quizSession.findMany({
          where: { quizId: q.id, studentId: userId, submittedAt: { not: null } },
          orderBy: { submittedAt: 'desc' },
        });
        const last = sessions[0] ?? null;
        const cs = classSubjects.find(c => c.id === q.classSubjectId)!;

        return {
          id: q.id,
          title: q.title,
          subject: { id: cs.subject.id, name: cs.subject.name, color: cs.subject.color.toLowerCase() },
          totalQuestions: q.totalQuestions,
          durationMinutes: q.durationMinutes,
          completed: !!last,
          lastScore: last?.score ?? null,
          lastStars: last?.stars ?? null,
        };
      }),
    );
  }

  async startQuiz(userId: string, quizId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Siswa tidak ditemukan' });

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        classSubject: true,
        questions: { orderBy: { order: 'asc' } },
      },
    });
    if (!quiz) throw new NotFoundException({ code: 'QUIZ_NOT_FOUND', message: 'Quiz tidak ditemukan' });

    const classSubject = await this.prisma.classSubject.findFirst({
      where: { id: quiz.classSubjectId, classId: student.classId },
    });
    if (!classSubject) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Akses ditolak' });

    const now = new Date();

    const existing = await this.prisma.quizSession.findFirst({
      where: { quizId, studentId: userId, submittedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (existing) {
      if (existing.expiresAt > now) {
        return this.buildStartResponse(quiz, existing);
      }
      // expired, auto-submit
      await this.finalizeSession(existing, quiz.questions);
    }

    const submittedCount = await this.prisma.quizSession.count({
      where: { quizId, studentId: userId, submittedAt: { not: null } },
    });
    if (submittedCount >= ((quiz as any).maxAttempts ?? 1)) {
      throw new ForbiddenException({ code: 'MAX_ATTEMPTS_REACHED', message: 'Batas percobaan quiz telah tercapai' });
    }

    const expiresAt = new Date(now.getTime() + quiz.durationMinutes * 60 * 1000);
    const session = await this.prisma.quizSession.create({
      data: { quizId, studentId: userId, expiresAt },
    });

    return this.buildStartResponse(quiz, session);
  }

  async saveAnswer(userId: string, sessionId: string, dto: SaveAnswerDto) {
    const session = await this.prisma.quizSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: 'Sesi tidak ditemukan' });
    if (session.studentId !== userId) throw new ForbiddenException({ code: 'NOT_OWNER', message: 'Akses ditolak' });
    if (session.submittedAt) throw new GoneException({ code: 'ALREADY_SUBMITTED', message: 'Quiz sudah dikumpulkan' });
    if (session.expiresAt <= new Date()) throw new GoneException({ code: 'SESSION_EXPIRED', message: 'Waktu habis' });

    const currentAnswers = (session.answers as Record<string, string>) ?? {};
    currentAnswers[dto.questionId] = dto.optionId;
    await this.prisma.quizSession.update({ where: { id: sessionId }, data: { answers: currentAnswers } });
  }

  async submitQuiz(userId: string, sessionId: string, dto: SubmitQuizDto) {
    const session = await this.prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: { quiz: { include: { questions: true } } },
    });
    if (!session) throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: 'Sesi tidak ditemukan' });
    if (session.studentId !== userId) throw new ForbiddenException({ code: 'NOT_OWNER', message: 'Akses ditolak' });

    if (session.submittedAt) {
      return this.buildSubmitResponse(session, session.quiz.questions);
    }

    const effectiveAnswers = dto.answers;
    const result = await this.finalizeSession(session, session.quiz.questions, effectiveAnswers);

    // XP update (idempotent — session.submittedAt was null, now updated)
    const xpEarned = (result.correctCount ?? 0) * 10;
    await this.prisma.student.update({
      where: { userId },
      data: { xp: { increment: xpEarned } },
    });
    await this.recomputeLevel(userId);

    const updated = await this.prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: { quiz: { include: { questions: true } } },
    });

    return this.buildSubmitResponse(updated!, updated!.quiz.questions);
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: { quiz: { include: { questions: true } } },
    });
    if (!session || session.studentId !== userId || !session.submittedAt) {
      throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: 'Hasil quiz tidak ditemukan' });
    }

    return this.buildSubmitResponse(session, session.quiz.questions);
  }

  private buildStartResponse(quiz: any, session: any) {
    return {
      sessionId: session.id,
      expiresAt: session.expiresAt,
      durationSeconds: quiz.durationMinutes * 60,
      questions: quiz.questions.map((q: any) => ({
        id: q.id,
        order: q.order,
        text: q.text,
        options: q.options,
        // correctOptionId and explanation NEVER included here
      })),
      existingAnswers: (session.answers as Record<string, string>) ?? {},
    };
  }

  private async finalizeSession(session: any, questions: any[], answers?: Record<string, string>) {
    const effectiveAnswers = answers ?? ((session.answers as Record<string, string>) ?? {});
    let correct = 0;
    questions.forEach(q => {
      if (effectiveAnswers[q.id] === q.correctOptionId) correct++;
    });

    const total = questions.length;
    const score = total ? Math.round((correct / total) * 100) : 0;
    const stars = score >= 90 ? 5 : score >= 80 ? 4 : score >= 70 ? 3 : score >= 60 ? 2 : 1;

    return this.prisma.quizSession.update({
      where: { id: session.id },
      data: {
        answers: effectiveAnswers,
        submittedAt: new Date(),
        score,
        correctCount: correct,
        stars,
      },
    });
  }

  private buildSubmitResponse(session: any, questions: any[]) {
    const answers = (session.answers as Record<string, string>) ?? {};
    const total = questions.length;
    const correct = session.correctCount ?? 0;
    const incorrect = questions.filter(q => answers[q.id] && answers[q.id] !== q.correctOptionId).length;
    const skipped = questions.filter(q => !answers[q.id]).length;
    const xpEarned = correct * 10;
    const startedAt = session.startedAt instanceof Date ? session.startedAt : new Date(session.startedAt);
    const submittedAt = session.submittedAt instanceof Date ? session.submittedAt : new Date(session.submittedAt);
    const timeUsedSeconds = Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000);

    return {
      sessionId: session.id,
      score: session.score,
      correct,
      incorrect,
      skipped,
      total,
      stars: session.stars,
      timeUsedSeconds,
      xpEarned,
      review: questions.map(q => ({
        questionId: q.id,
        text: q.text,
        options: q.options,
        myAnswer: answers[q.id] ?? null,
        correctOptionId: q.correctOptionId,
        isCorrect: answers[q.id] === q.correctOptionId,
        explanation: q.explanation,
      })),
    };
  }

  private async recomputeLevel(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) return;
    let level = student.level;
    while (student.xp >= 1000 + level * 100) level++;
    if (level !== student.level) {
      await this.prisma.student.update({ where: { userId }, data: { level } });
    }
  }
}
