import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentType, SubmissionKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async getAssignments(userId: string, status?: string, subjectId?: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Siswa tidak ditemukan' });

    const classSubjectFilter = subjectId
      ? { classId: student.classId, subjectId }
      : { classId: student.classId };

    const classSubjects = await this.prisma.classSubject.findMany({
      where: classSubjectFilter,
      select: { id: true, subject: { select: { id: true, name: true, color: true } }, teacher: { select: { name: true } } },
    });

    const csIds = classSubjects.map(cs => cs.id);
    const now = new Date();

    const assignments = await this.prisma.assignment.findMany({
      where: { classSubjectId: { in: csIds } },
      orderBy: { dueAt: 'asc' },
      include: { submissions: { where: { studentId: userId } } },
    });

    const results = assignments.map(a => {
      const submission = a.submissions[0] ?? null;
      const cs = classSubjects.find(c => c.id === a.classSubjectId)!;
      let derivedStatus: string;

      if (submission) {
        derivedStatus = 'selesai';
      } else if (a.dueAt <= new Date(now.getTime() + 48 * 60 * 60 * 1000)) {
        derivedStatus = 'segera';
      } else {
        derivedStatus = 'belum';
      }

      return {
        id: a.id,
        title: a.title,
        subject: { id: cs.subject.id, name: cs.subject.name, color: cs.subject.color.toLowerCase() },
        teacher: { name: cs.teacher.name },
        type: a.type,
        totalItems: a.totalItems,
        maxScore: a.maxScore,
        dueAt: a.dueAt,
        status: derivedStatus,
        score: submission?.score ?? null,
      };
    });

    if (status && status !== 'all') {
      return results.filter(r => r.status === status);
    }
    return results;
  }

  async getAssignment(userId: string, assignmentId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Siswa tidak ditemukan' });

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        classSubject: {
          include: {
            subject: true,
            teacher: true,
          },
        },
        submissions: {
          where: { studentId: userId },
          include: { student: false },
        },
      },
    });

    if (!assignment) throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Tugas tidak ditemukan' });

    const accessible = assignment.classSubject.classId === student.classId;
    if (!accessible) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Akses ditolak' });

    const submission = assignment.submissions[0] ?? null;
    let gradedBy: string | null = null;
    if (submission?.gradedById) {
      const grader = await this.prisma.teacher.findUnique({ where: { userId: submission.gradedById } });
      gradedBy = grader?.name ?? null;
    }

    return {
      id: assignment.id,
      title: assignment.title,
      subject: {
        id: assignment.classSubject.subject.id,
        name: assignment.classSubject.subject.name,
        color: assignment.classSubject.subject.color.toLowerCase(),
      },
      teacher: { name: assignment.classSubject.teacher.name },
      type: assignment.type,
      description: assignment.description,
      instructions: assignment.instructions as string[],
      minWords: assignment.minWords,
      attachment: assignment.attachmentUrl
        ? { name: assignment.attachmentName, sizeKB: assignment.attachmentSize ? Math.round(assignment.attachmentSize / 1024) : null, url: assignment.attachmentUrl }
        : null,
      rubric: assignment.rubric as { label: string; max: number }[],
      maxScore: assignment.maxScore,
      dueAt: assignment.dueAt,
      submission: submission
        ? {
            kind: submission.kind,
            fileName: submission.fileName,
            fileSizeKB: submission.fileSize ? Math.round(submission.fileSize / 1024) : null,
            fileUrl: submission.fileUrl,
            essayText: submission.essayText,
            note: submission.noteFromStudent,
            submittedAt: submission.submittedAt,
            score: submission.score,
            feedback: submission.feedback,
            feedbackFrom: gradedBy,
            rubricBreakdown: submission.rubricBreakdown as object[] | null,
          }
        : null,
    };
  }

  async submit(userId: string, assignmentId: string, dto: SubmitAssignmentDto) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Siswa tidak ditemukan' });

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { classSubject: true },
    });
    if (!assignment) throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Tugas tidak ditemukan' });
    if (assignment.classSubject.classId !== student.classId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Akses ditolak' });
    }

    const existing = await this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: userId } },
    });
    if (existing) throw new ConflictException({ code: 'ALREADY_SUBMITTED', message: 'Tugas sudah pernah dikumpulkan' });

    let kind: SubmissionKind;
    if (assignment.type === AssignmentType.UPLOAD_FILE) {
      kind = SubmissionKind.FILE;
      if (!dto.fileUrl) throw new BadRequestException({ code: 'INVALID_KIND', message: 'File URL wajib untuk tugas upload' });
    } else if (assignment.type === AssignmentType.ESSAY) {
      kind = SubmissionKind.ESSAY;
      if (!dto.essayText) throw new BadRequestException({ code: 'INVALID_KIND', message: 'Teks essay wajib' });
      if (assignment.minWords) {
        const wordCount = dto.essayText.trim().split(/\s+/).length;
        if (wordCount < assignment.minWords) {
          throw new BadRequestException({ code: 'ESSAY_TOO_SHORT', message: `Essay minimal ${assignment.minWords} kata` });
        }
      }
    } else {
      kind = SubmissionKind.ONLINE_ANSWERS;
    }

    const submission = await this.prisma.assignmentSubmission.create({
      data: {
        assignmentId,
        studentId: userId,
        kind,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        essayText: dto.essayText,
        noteFromStudent: dto.note,
        answers: dto.answers ?? undefined,
      },
    });

    return { submittedAt: submission.submittedAt };
  }
}
