/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  AdminScope,
  AssignmentType,
  NotificationType,
  PrismaClient,
  Role,
  SubmissionKind,
  SubjectColor,
} from '@prisma/client';
import * as argon2 from 'argon2';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await argon2.hash('password');

  // ─── School & Class ────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { code: 'SMAN1JKT' },
    update: {},
    create: { name: 'SMA Negeri 1 Jakarta', code: 'SMAN1JKT' },
  });

  const kelas = await prisma.class.upsert({
    where: { schoolId_name: { schoolId: school.id, name: 'XII IPA 1' } },
    update: {},
    create: { schoolId: school.id, name: 'XII IPA 1', gradeYear: 12 },
  });

  // ─── Admin ─────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@sman1jkt.sch.id' },
    update: {},
    create: {
      schoolId: school.id,
      role: Role.ADMIN,
      email: 'admin@sman1jkt.sch.id',
      passwordHash,
      mustChangePassword: false,
    },
  });
  await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      name: 'Admin SMAN 1 Jakarta',
      scope: AdminScope.SCHOOL,
    },
  });

  // ─── Teachers ──────────────────────────────────────────────────
  const teacherDefs = [
    {
      email: 'ahmad.fauzi@sman1jkt.sch.id',
      name: 'Pak Ahmad Fauzi',
      title: 'S.Pd',
    },
    {
      email: 'sari.rahayu@sman1jkt.sch.id',
      name: 'Bu Sari Rahayu',
      title: 'M.Si',
    },
    {
      email: 'budi.santoso@sman1jkt.sch.id',
      name: 'Pak Budi Santoso',
      title: 'S.Pd',
    },
    {
      email: 'dewi.permata@sman1jkt.sch.id',
      name: 'Bu Dewi Permata',
      title: 'M.Pd',
    },
    {
      email: 'hendra.wijaya@sman1jkt.sch.id',
      name: 'Pak Hendra Wijaya',
      title: 'S.S',
    },
    {
      email: 'ratna.dewi@sman1jkt.sch.id',
      name: 'Bu Ratna Dewi',
      title: 'M.Hum',
    },
  ];

  const teachers: { userId: string; name: string }[] = [];
  for (const t of teacherDefs) {
    const u = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        schoolId: school.id,
        role: Role.TEACHER,
        email: t.email,
        passwordHash,
        mustChangePassword: false,
      },
    });
    await prisma.teacher.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, name: t.name, title: t.title },
    });
    teachers.push({ userId: u.id, name: t.name });
  }

  // ─── Students ──────────────────────────────────────────────────
  const studentDefs = [
    {
      email: 'rizky.aditya@student.sman1jkt.sch.id',
      name: 'Rizky Aditya Pratama',
      nis: '12345678',
      xp: 1240,
    },
    {
      email: 'aysha.nabila@student.sman1jkt.sch.id',
      name: 'Aysha Nabila Putri',
      nis: '12345679',
      xp: 2140,
    },
    {
      email: 'bagas.prasetyo@student.sman1jkt.sch.id',
      name: 'Bagas Prasetyo',
      nis: '12345680',
      xp: 980,
    },
    {
      email: 'dinda.aulia@student.sman1jkt.sch.id',
      name: 'Dinda Aulia',
      nis: '12345681',
      xp: 760,
    },
  ];

  const studentUsers: Record<string, string> = {};
  for (const s of studentDefs) {
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        schoolId: school.id,
        role: Role.STUDENT,
        email: s.email,
        passwordHash,
        mustChangePassword: false,
      },
    });
    await prisma.student.upsert({
      where: { nis: s.nis },
      update: {},
      create: {
        userId: u.id,
        nis: s.nis,
        name: s.name,
        classId: kelas.id,
        level: 12,
        xp: s.xp,
      },
    });
    studentUsers[s.nis] = u.id;
  }

  const rizkyId = studentUsers['12345678'];

  // ─── Subjects ──────────────────────────────────────────────────
  const subjectDefs = [
    {
      name: 'Matematika',
      shortName: 'MAT',
      color: SubjectColor.BLUE,
      iconKey: 'math',
      teacherIdx: 0,
    },
    {
      name: 'Biologi',
      shortName: 'BIO',
      color: SubjectColor.TEAL,
      iconKey: 'biology',
      teacherIdx: 1,
    },
    {
      name: 'Fisika',
      shortName: 'FIS',
      color: SubjectColor.YELLOW,
      iconKey: 'physics',
      teacherIdx: 2,
    },
    {
      name: 'Kimia',
      shortName: 'KIM',
      color: SubjectColor.RED,
      iconKey: 'chemistry',
      teacherIdx: 3,
    },
    {
      name: 'Bahasa Indonesia',
      shortName: 'B.IND',
      color: SubjectColor.MINT,
      iconKey: 'language',
      teacherIdx: 4,
    },
    {
      name: 'Sejarah',
      shortName: 'SEJ',
      color: SubjectColor.PURPLE,
      iconKey: 'history',
      teacherIdx: 5,
    },
  ];

  const subjectIds: string[] = [];
  const classSubjectIds: string[] = [];

  for (const sd of subjectDefs) {
    const subject = await prisma.subject.upsert({
      where: { schoolId_name: { schoolId: school.id, name: sd.name } },
      update: {},
      create: {
        schoolId: school.id,
        name: sd.name,
        shortName: sd.shortName,
        color: sd.color,
        iconKey: sd.iconKey,
      },
    });
    subjectIds.push(subject.id);

    const cs = await prisma.classSubject.upsert({
      where: {
        classId_subjectId: { classId: kelas.id, subjectId: subject.id },
      },
      update: {},
      create: {
        classId: kelas.id,
        subjectId: subject.id,
        teacherId: teachers[sd.teacherIdx].userId,
      },
    });
    classSubjectIds.push(cs.id);
  }

  // ─── Chapters ──────────────────────────────────────────────────
  const chapterDefs: Record<number, string[]> = {
    0: [
      'Limit Fungsi',
      'Turunan',
      'Persamaan Diferensial',
      'Integral Tentu',
      'Aplikasi Integral',
    ],
    1: ['Sel dan Jaringan', 'Sistem Organ', 'Genetika', 'Evolusi'],
    2: ['Kinematika', 'Dinamika', 'Gerak Harmonik', 'Termodinamika'],
    3: ['Ikatan Kimia', 'Reaksi Redoks', 'Laju Reaksi', 'Kesetimbangan'],
    4: ['Teks Narasi', 'Teks Eksposisi', 'Teks Argumentasi'],
    5: ['Kemerdekaan Indonesia', 'Orde Lama', 'Orde Baru'],
  };

  const chapterIds: Record<number, string[]> = {};
  for (const [subIdx, titles] of Object.entries(chapterDefs)) {
    const idx = parseInt(subIdx);
    chapterIds[idx] = [];
    for (let i = 0; i < titles.length; i++) {
      const ch = await prisma.chapter.upsert({
        where: {
          subjectId_order: { subjectId: subjectIds[idx], order: i + 1 },
        },
        update: {},
        create: { subjectId: subjectIds[idx], order: i + 1, title: titles[i] },
      });
      chapterIds[idx].push(ch.id);
    }
  }

  // Rizky: chapters 1-2 of Matematika completed, chapter 1 of Biologi completed
  const completedChapters = [
    {
      chapterId: chapterIds[0][0],
      completedAt: new Date('2026-02-10T07:00:00Z'),
    },
    {
      chapterId: chapterIds[0][1],
      completedAt: new Date('2026-03-05T08:00:00Z'),
    },
    {
      chapterId: chapterIds[1][0],
      completedAt: new Date('2026-04-01T09:00:00Z'),
    },
  ];
  for (const cp of completedChapters) {
    await prisma.chapterProgress.upsert({
      where: {
        studentId_chapterId: { studentId: rizkyId, chapterId: cp.chapterId },
      },
      update: {},
      create: {
        studentId: rizkyId,
        chapterId: cp.chapterId,
        completed: true,
        completedAt: cp.completedAt,
      },
    });
  }

  // ─── Schedule (Monday) ─────────────────────────────────────────
  const scheduleDefs = [
    {
      subjectIdx: 0,
      dayOfWeek: 1,
      timeStart: '07:30',
      timeEnd: '08:45',
      room: 'Ruang 3A',
    },
    {
      subjectIdx: 1,
      dayOfWeek: 1,
      timeStart: '08:45',
      timeEnd: '10:00',
      room: 'Ruang 2B',
    },
    {
      subjectIdx: 2,
      dayOfWeek: 1,
      timeStart: '10:15',
      timeEnd: '11:30',
      room: 'Lab Fisika',
    },
    {
      subjectIdx: 4,
      dayOfWeek: 1,
      timeStart: '12:30',
      timeEnd: '13:45',
      room: 'Ruang 1C',
    },
    {
      subjectIdx: 0,
      dayOfWeek: 3,
      timeStart: '07:30',
      timeEnd: '08:45',
      room: 'Ruang 3A',
    },
    {
      subjectIdx: 3,
      dayOfWeek: 3,
      timeStart: '10:15',
      timeEnd: '11:30',
      room: 'Lab Kimia',
    },
    {
      subjectIdx: 5,
      dayOfWeek: 4,
      timeStart: '08:45',
      timeEnd: '10:00',
      room: 'Ruang 2A',
    },
  ];

  for (const sd of scheduleDefs) {
    const existing = await prisma.scheduleSlot.findFirst({
      where: {
        classId: kelas.id,
        subjectId: subjectIds[sd.subjectIdx],
        dayOfWeek: sd.dayOfWeek,
        timeStart: sd.timeStart,
      },
    });
    if (!existing) {
      await prisma.scheduleSlot.create({
        data: {
          classId: kelas.id,
          subjectId: subjectIds[sd.subjectIdx],
          dayOfWeek: sd.dayOfWeek,
          timeStart: sd.timeStart,
          timeEnd: sd.timeEnd,
          room: sd.room,
        },
      });
    }
  }

  // ─── Assignments ───────────────────────────────────────────────
  const assignmentDefs = [
    {
      csIdx: 0,
      title: 'Latihan Soal Integral Tertentu',
      description: 'Kerjakan 20 soal pilihan ganda tentang integral tertentu.',
      instructions: [
        'Baca soal dengan teliti',
        'Boleh menggunakan kalkulator saintifik',
        'Kerjakan sendiri',
      ],
      type: AssignmentType.ONLINE,
      totalItems: '20 soal',
      rubric: [{ label: 'Ketepatan jawaban', max: 100 }],
      daysFromNow: 5,
    },
    {
      csIdx: 1,
      title: 'Essay Perkembangbiakan Makhluk Hidup',
      description:
        'Tulis essay tentang mekanisme perkembangbiakan makhluk hidup.',
      instructions: [
        'Minimal 800 kata',
        'Gunakan referensi ilmiah',
        'Sertakan gambar diagram jika perlu',
      ],
      type: AssignmentType.ESSAY,
      totalItems: 'Min 800 kata',
      minWords: 800,
      rubric: [
        { label: 'Kelengkapan isi', max: 40 },
        { label: 'Analisis', max: 30 },
        { label: 'Tata bahasa', max: 30 },
      ],
      daysFromNow: 7,
    },
    {
      csIdx: 2,
      title: 'Laporan Praktikum Gerak Lurus',
      description:
        'Buat laporan hasil praktikum gerak lurus beraturan dan berubah beraturan.',
      instructions: [
        'Format laporan sesuai template',
        'Sertakan grafik hasil percobaan',
        'Upload dalam format PDF',
      ],
      type: AssignmentType.UPLOAD_FILE,
      totalItems: 'PDF max 10MB',
      rubric: [
        { label: 'Metodologi', max: 30 },
        { label: 'Analisis data', max: 40 },
        { label: 'Kesimpulan', max: 30 },
      ],
      daysFromNow: 3,
    },
    {
      csIdx: 3,
      title: 'Reaksi Kimia Organik',
      description: 'Kerjakan soal-soal tentang reaksi kimia organik.',
      instructions: ['Jawab 15 soal pilihan ganda', 'Waktu 30 menit'],
      type: AssignmentType.ONLINE,
      totalItems: '15 soal',
      rubric: [{ label: 'Ketepatan jawaban', max: 100 }],
      daysFromNow: -5, // past due
    },
    {
      csIdx: 4,
      title: 'Analisis Teks Sastra',
      description:
        'Analisis unsur intrinsik dan ekstrinsik novel "Laskar Pelangi".',
      instructions: [
        'Identifikasi 5 unsur intrinsik',
        'Berikan contoh kutipan dari teks',
        'Minimal 600 kata',
      ],
      type: AssignmentType.ESSAY,
      totalItems: 'Min 600 kata',
      minWords: 600,
      rubric: [
        { label: 'Analisis intrinsik', max: 50 },
        { label: 'Analisis ekstrinsik', max: 30 },
        { label: 'Tata bahasa', max: 20 },
      ],
      daysFromNow: -3, // past due
    },
  ];

  const assignmentIds: string[] = [];
  for (const ad of assignmentDefs) {
    const dueAt = new Date(Date.now() + ad.daysFromNow * 24 * 60 * 60 * 1000);
    const existing = await prisma.assignment.findFirst({
      where: { classSubjectId: classSubjectIds[ad.csIdx], title: ad.title },
    });
    if (existing) {
      assignmentIds.push(existing.id);
    } else {
      const a = await prisma.assignment.create({
        data: {
          classSubjectId: classSubjectIds[ad.csIdx],
          title: ad.title,
          description: ad.description,
          instructions: ad.instructions,
          type: ad.type,
          totalItems: ad.totalItems,
          minWords: ad.minWords,
          rubric: ad.rubric,
          dueAt,
          createdById: teachers[ad.csIdx].userId,
        },
      });
      assignmentIds.push(a.id);
    }
  }

  // Rizky: submission for assignments 4 and 5 (graded)
  const gradedSubmissions = [
    {
      assignmentIdx: 3,
      score: 90,
      feedback: 'Jawaban sangat baik dan tepat!',
      gradedById: teachers[3].userId,
    },
    {
      assignmentIdx: 4,
      score: 85,
      feedback: 'Analisis bagus, perlu sedikit perbaikan tata bahasa.',
      gradedById: teachers[4].userId,
    },
  ];

  for (const gs of gradedSubmissions) {
    await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: assignmentIds[gs.assignmentIdx],
          studentId: rizkyId,
        },
      },
      update: {},
      create: {
        assignmentId: assignmentIds[gs.assignmentIdx],
        studentId: rizkyId,
        kind: SubmissionKind.ONLINE_ANSWERS,
        essayText: 'Lorem ipsum essay text placeholder...',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        score: gs.score,
        feedback: gs.feedback,
        gradedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        gradedById: gs.gradedById,
        rubricBreakdown: [
          { label: 'Ketepatan jawaban', max: 100, earned: gs.score },
        ],
      },
    });
  }

  // ─── Quizzes ───────────────────────────────────────────────────
  const quizDefs = [
    {
      csIdx: 0,
      title: 'Quiz Integral',
      chapter: 'Bab 4',
      duration: 20,
      questions: 5,
    },
    {
      csIdx: 1,
      title: 'Quiz Sel dan Jaringan',
      chapter: 'Bab 1',
      duration: 15,
      questions: 5,
    },
    {
      csIdx: 2,
      title: 'Quiz Kinematika',
      chapter: 'Bab 1',
      duration: 15,
      questions: 5,
    },
    {
      csIdx: 3,
      title: 'Quiz Ikatan Kimia',
      chapter: 'Bab 1',
      duration: 20,
      questions: 5,
    },
    {
      csIdx: 5,
      title: 'Quiz Kemerdekaan Indonesia',
      chapter: 'Bab 1',
      duration: 20,
      questions: 5,
    },
  ];

  const quizIds: string[] = [];
  for (const qd of quizDefs) {
    const existing = await prisma.quiz.findFirst({
      where: { classSubjectId: classSubjectIds[qd.csIdx], title: qd.title },
    });
    if (existing) {
      quizIds.push(existing.id);
      continue;
    }
    const quiz = await prisma.quiz.create({
      data: {
        classSubjectId: classSubjectIds[qd.csIdx],
        title: qd.title,
        chapter: qd.chapter,
        durationMinutes: qd.duration,
        totalQuestions: qd.questions,
        createdById: teachers[qd.csIdx === 5 ? 5 : qd.csIdx].userId,
      },
    });
    quizIds.push(quiz.id);

    // Create 5 generic questions per quiz
    for (let i = 1; i <= qd.questions; i++) {
      await prisma.quizQuestion.upsert({
        where: { quizId_order: { quizId: quiz.id, order: i } },
        update: {},
        create: {
          quizId: quiz.id,
          order: i,
          text: `Soal nomor ${i} dari quiz ${qd.title}: pilih jawaban yang benar.`,
          options: [
            { id: 'a', text: 'Pilihan A' },
            { id: 'b', text: 'Pilihan B' },
            { id: 'c', text: 'Pilihan C' },
            { id: 'd', text: 'Pilihan D' },
          ],
          correctOptionId: 'a',
          explanation: `Jawaban benar adalah A karena sesuai dengan materi ${qd.chapter}.`,
        },
      });
    }
  }

  // Rizky: completed sessions for quiz 4 (Kimia) and quiz 5 (Sejarah)
  const completedSessions = [
    { quizIdx: 3, score: 80, correctCount: 4, stars: 4 },
    { quizIdx: 4, score: 100, correctCount: 5, stars: 5 },
  ];

  for (const cs of completedSessions) {
    const existingSession = await prisma.quizSession.findFirst({
      where: {
        quizId: quizIds[cs.quizIdx],
        studentId: rizkyId,
        submittedAt: { not: null },
      },
    });
    if (!existingSession) {
      const startedAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const submittedAt = new Date(startedAt.getTime() + 10 * 60 * 1000);
      await prisma.quizSession.create({
        data: {
          quizId: quizIds[cs.quizIdx],
          studentId: rizkyId,
          startedAt,
          expiresAt: new Date(startedAt.getTime() + 20 * 60 * 1000),
          submittedAt,
          answers: { [await getFirstQuestionId(quizIds[cs.quizIdx])]: 'a' },
          score: cs.score,
          correctCount: cs.correctCount,
          stars: cs.stars,
        },
      });
    }
  }

  // ─── Forum ─────────────────────────────────────────────────────
  const ayshyaId = studentUsers['12345679'];
  const bagasId = studentUsers['12345680'];
  const pAhmadUserId = teachers[0].userId;

  const forumDefs = [
    {
      authorId: pAhmadUserId,
      content:
        '📢 Pengumuman: UTS akan dilaksanakan minggu depan. Pastikan kalian sudah mempelajari semua bab yang telah diajarkan.',
      subjectId: null,
      isPinned: true,
    },
    {
      authorId: ayshyaId,
      content:
        'Halo teman-teman! Ada yang bisa bantu jelasin tentang proses mitosis vs meiosis? Aku masih bingung perbedaannya 😅',
      subjectId: subjectIds[1], // Biologi
      isPinned: false,
    },
    {
      authorId: rizkyId,
      content:
        'Untuk soal integral substitusi nomor 5 di latihan halaman 87, ada yang tau cara penyelesaiannya? Aku coba sudah 3 kali tapi hasilnya berbeda terus.',
      subjectId: subjectIds[0], // Matematika
      isPinned: false,
    },
    {
      authorId: bagasId,
      content:
        'Mau tanya, untuk laporan praktikum fisika formatnya seperti apa ya? Gurunya bilang ikuti template tapi aku gak nemu filenya.',
      subjectId: subjectIds[2], // Fisika
      isPinned: false,
    },
  ];

  const forumPostIds: string[] = [];
  for (const fd of forumDefs) {
    const existing = await prisma.forumPost.findFirst({
      where: {
        authorId: fd.authorId,
        content: { startsWith: fd.content.slice(0, 30) },
      },
    });
    if (existing) {
      forumPostIds.push(existing.id);
      continue;
    }
    const post = await prisma.forumPost.create({
      data: {
        schoolId: school.id,
        classId: kelas.id,
        authorId: fd.authorId,
        content: fd.content,
        subjectId: fd.subjectId,
        isPinned: fd.isPinned,
      },
    });
    forumPostIds.push(post.id);
  }

  // Add replies to forum post 2 (Aysha's biology question)
  if (forumPostIds[1]) {
    const existingReply = await prisma.forumReply.findFirst({
      where: { postId: forumPostIds[1] },
    });
    if (!existingReply) {
      await prisma.forumReply.create({
        data: {
          postId: forumPostIds[1],
          authorId: rizkyId,
          content:
            'Mitosis menghasilkan 2 sel anak dengan jumlah kromosom sama (diploid), sedangkan meiosis menghasilkan 4 sel anak dengan jumlah setengahnya (haploid).',
        },
      });
    }
  }

  // ─── Badges ────────────────────────────────────────────────────
  const badgeDefs = [
    {
      id: 'top-kelas',
      label: 'Top Kelas',
      iconEmoji: '🏆',
      description: 'Meraih peringkat 1 di kelas',
    },
    {
      id: 'streak-7',
      label: '7 Hari Streak',
      iconEmoji: '🔥',
      description: 'Login 7 hari berturut-turut',
    },
    {
      id: 'quiz-master',
      label: 'Quiz Master',
      iconEmoji: '🎯',
      description: 'Menyelesaikan 5 quiz dengan nilai sempurna',
    },
    {
      id: 'rajin-baca',
      label: 'Rajin Baca',
      iconEmoji: '📚',
      description: 'Menyelesaikan 20 chapter materi',
    },
    {
      id: 'diskusi-aktif',
      label: 'Diskusi Aktif',
      iconEmoji: '💬',
      description: 'Membuat 10 postingan di forum',
    },
    {
      id: 'nilai-sempurna',
      label: 'Nilai Sempurna',
      iconEmoji: '⭐',
      description: 'Mendapat nilai 100 di quiz',
    },
  ];

  for (const b of badgeDefs) {
    await prisma.badge.upsert({
      where: { id: b.id },
      update: {},
      create: b,
    });
  }

  // Rizky earns 3 badges
  const earnedBadges = [
    { badgeId: 'top-kelas', earnedAt: new Date('2026-04-12T03:00:00Z') },
    { badgeId: 'streak-7', earnedAt: new Date('2026-05-20T00:00:00Z') },
    { badgeId: 'quiz-master', earnedAt: new Date('2026-05-25T00:00:00Z') },
  ];

  for (const eb of earnedBadges) {
    await prisma.studentBadge.upsert({
      where: { studentId_badgeId: { studentId: rizkyId, badgeId: eb.badgeId } },
      update: {},
      create: {
        studentId: rizkyId,
        badgeId: eb.badgeId,
        earnedAt: eb.earnedAt,
      },
    });
  }

  // ─── Notifications ─────────────────────────────────────────────
  const notifDefs = [
    {
      type: NotificationType.ASSIGNMENT_GRADED,
      title: 'Nilai tugas Kimia keluar',
      body: 'Skor: 90/100 — Jawaban sangat baik dan tepat!',
      linkTo: `/student/tugas/${assignmentIds[3]}`,
    },
    {
      type: NotificationType.QUIZ_NEW,
      title: 'Quiz baru tersedia',
      body: 'Quiz Integral telah ditambahkan oleh Pak Ahmad Fauzi',
      linkTo: `/student/quiz/${quizIds[0]}`,
      readAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      type: NotificationType.FORUM_REPLY,
      title: 'Ada balasan di postingan Anda',
      body: 'Mitosis menghasilkan 2 sel anak...',
      linkTo: forumPostIds[2] ? `/student/forum/${forumPostIds[2]}` : null,
    },
  ];

  for (const nd of notifDefs) {
    const existing = await prisma.notification.findFirst({
      where: { userId: rizkyId, type: nd.type, title: nd.title },
    });
    if (!existing) {
      await prisma.notification.create({
        data: { userId: rizkyId, ...nd },
      });
    }
  }

  console.log('Seed Phase 2 selesai');
  console.log(
    '─────────────────────────────────────────────────────────────────',
  );
  console.log('Student  → NIS: 12345678 (Rizky)   | pass: password');
  console.log('Student  → NIS: 12345679 (Aysha)   | pass: password');
  console.log('Student  → NIS: 12345680 (Bagas)   | pass: password');
  console.log('Student  → NIS: 12345681 (Dinda)   | pass: password');
  console.log('Teacher  → email: ahmad.fauzi@sman1jkt.sch.id | pass: password');
  console.log(
    'Admin    → email: admin@sman1jkt.sch.id        | pass: password',
  );
}

async function getFirstQuestionId(quizId: string): Promise<string> {
  const q = await prisma.quizQuestion.findFirst({
    where: { quizId },
    orderBy: { order: 'asc' },
  });
  return q?.id ?? '';
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
