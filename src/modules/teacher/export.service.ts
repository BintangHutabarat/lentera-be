import { Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async exportAssignmentScores(userId: string, assignmentId: string, res: Response) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        classSubject: { include: { class: { include: { students: { orderBy: { name: 'asc' } } } }, subject: true } },
        submissions: true,
      },
    });

    if (!assignment) throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Tugas tidak ditemukan' });
    if (assignment.classSubject.teacherId !== userId) {
      throw new NotFoundException({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Tugas tidak ditemukan' });
    }

    const subMap = new Map(assignment.submissions.map(s => [s.studentId, s]));
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Nilai');

    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Nama', key: 'name', width: 30 },
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Waktu Kumpul', key: 'submittedAt', width: 20 },
      { header: 'Nilai', key: 'score', width: 8 },
      { header: 'Feedback', key: 'feedback', width: 40 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

    assignment.classSubject.class.students.forEach((student, i) => {
      const sub = subMap.get(student.userId);
      sheet.addRow({
        no: i + 1,
        name: student.name,
        nis: student.nis,
        status: sub ? (sub.gradedAt ? 'Dinilai' : 'Terkumpul') : 'Belum',
        submittedAt: sub ? sub.submittedAt.toLocaleString('id-ID') : '-',
        score: sub?.score ?? '-',
        feedback: sub?.feedback ?? '-',
      });
    });

    const filename = `nilai-${assignment.title.replace(/\s+/g, '-')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  async exportQuizScores(userId: string, quizId: string, res: Response) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        classSubject: { include: { class: { include: { students: { orderBy: { name: 'asc' } } } }, subject: true } },
        sessions: { where: { submittedAt: { not: null } }, orderBy: { score: 'desc' } },
      },
    });

    if (!quiz) throw new NotFoundException({ code: 'QUIZ_NOT_FOUND', message: 'Quiz tidak ditemukan' });
    if (quiz.classSubject.teacherId !== userId) {
      throw new NotFoundException({ code: 'QUIZ_NOT_FOUND', message: 'Quiz tidak ditemukan' });
    }

    const sessionMap = new Map<string, typeof quiz.sessions[0]>();
    quiz.sessions.forEach(s => { if (!sessionMap.has(s.studentId)) sessionMap.set(s.studentId, s); });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Hasil Quiz');

    sheet.columns = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Nama', key: 'name', width: 30 },
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Nilai', key: 'score', width: 8 },
      { header: 'Benar', key: 'correct', width: 8 },
      { header: 'Bintang', key: 'stars', width: 8 },
      { header: 'Waktu Submit', key: 'submittedAt', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };

    quiz.classSubject.class.students.forEach((student, i) => {
      const session = sessionMap.get(student.userId);
      sheet.addRow({
        no: i + 1,
        name: student.name,
        nis: student.nis,
        status: session ? 'Dikerjakan' : 'Belum',
        score: session?.score ?? '-',
        correct: session?.correctCount ?? '-',
        stars: session?.stars ?? '-',
        submittedAt: session?.submittedAt ? session.submittedAt.toLocaleString('id-ID') : '-',
      });
    });

    const filename = `hasil-${quiz.title.replace(/\s+/g, '-')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }
}
