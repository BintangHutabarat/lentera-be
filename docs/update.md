# Update Brief — Yayasan Darul Itqon Al Hakim (YDIAH)

Dokumen ini mencatat hasil meeting dan QnA dengan pihak yayasan, serta rencana implementasi teknis.

---

## Ringkasan Kebutuhan

### Pelajaran
- 6 mata pelajaran berbahasa Arab + 1 Bahasa Inggris
- Nama pelajaran dalam bahasa Arab, tidak perlu dukungan RTL di UI
- Konten materi menggunakan foto/gambar yang diinput oleh guru

### Guru
- Halaman absensi per pertemuan
- Halaman penilaian siswa: tugas, quiz, ujian, kehadiran
- Nilai akhir diinput manual oleh guru (sistem hanya menyediakan referensi kalkulasi otomatis)
- Bisa export raport dalam format JSON → FE generate PDF/Excel

### Admin
- Admin saat ini = Super Admin (full access)
- Kepala sekolah = role `PRINCIPAL` baru, akses terbatas

### Landing Page
- Ditangani oleh FE, tidak ada perubahan di BE

---

## Keputusan Teknis dari QnA

### Absensi (Pertemuan)
- Status: `HADIR` | `SAKIT` | `IZIN` | `ALPHA`
- Guru membuka pertemuan → sistem auto-generate record attendance semua siswa dengan status default `ALPHA`
- Guru update status tiap siswa → tutup pertemuan
- `totalMeetings` disimpan di `ClassSubject` (contoh: 16 pertemuan/semester)
- Rekap absensi hanya tampil ke guru dan admin/principal

### Ujian (Exam)
- Selalu offline — guru input nilai langsung per siswa, tidak ada submission dari app
- Jumlah ujian per semester per mapel bebas

### Nilai Akhir & Raport
- Komponen: Tugas, Quiz, Ujian, Kehadiran (tidak ada UTS/UAS)
- Skala: 0–100
- Sistem menghitung referensi otomatis per komponen
- Guru tetap input nilai akhir secara manual
- Raport per **tahun ajaran** (contoh: `"2025/2026"`) dan per semester (1 atau 2)
- BE menyediakan endpoint JSON → FE render ke PDF/Excel

### Tahun Ajaran
- Format label: `"2025/2026"`
- Admin yang membuat dan mengaktifkan tahun ajaran
- Tidak perlu rentang tanggal, cukup label + flag `isActive`

### Role Kepala Sekolah
- Role baru `PRINCIPAL` ditambah ke enum `Role`
- Bisa: lihat semua kelas, siswa, nilai, rekap absensi lintas kelas
- Bisa: manage user (buat/edit/hapus siswa & guru), manage kelas, manage mapel
- Tidak bisa: hapus assignment, quiz, ujian

---

## Rencana Schema (Prisma)

### Enum Baru
```prisma
enum MeetingStatus {
  OPEN
  CLOSED
}

enum AttendanceStatus {
  HADIR
  SAKIT
  IZIN
  ALPHA
}
```

### Update Enum Existing
```prisma
enum Role {
  STUDENT
  TEACHER
  ADMIN
  PRINCIPAL   // kepala sekolah
}
```

### Model Baru

**AcademicYear**
```prisma
model AcademicYear {
  id       String  @id @default(cuid())
  schoolId String
  school   School  @relation(...)
  label    String  // "2025/2026"
  isActive Boolean @default(false)

  finalGrades FinalGrade[]

  @@unique([schoolId, label])
}
```

**Meeting (Pertemuan)**
```prisma
model Meeting {
  id             String        @id @default(cuid())
  classSubjectId String
  classSubject   ClassSubject  @relation(...)
  meetingNumber  Int
  status         MeetingStatus @default(OPEN)
  startedAt      DateTime      @default(now())
  endedAt        DateTime?

  attendances Attendance[]

  @@unique([classSubjectId, meetingNumber])
}
```

**Attendance**
```prisma
model Attendance {
  id        String           @id @default(cuid())
  meetingId String
  meeting   Meeting          @relation(...)
  studentId String
  student   Student          @relation(...)
  status    AttendanceStatus @default(ALPHA)

  @@unique([meetingId, studentId])
}
```

**Exam (Ujian)**
```prisma
model Exam {
  id             String       @id @default(cuid())
  classSubjectId String
  classSubject   ClassSubject @relation(...)
  title          String
  description    String?      @db.Text
  maxScore       Int          @default(100)
  date           DateTime?
  createdById    String
  createdAt      DateTime     @default(now())

  grades ExamGrade[]

  @@index([classSubjectId])
}
```

**ExamGrade**
```prisma
model ExamGrade {
  id         String   @id @default(cuid())
  examId     String
  exam       Exam     @relation(...)
  studentId  String
  student    Student  @relation(...)
  score      Int?
  notes      String?  @db.Text
  gradedAt   DateTime?
  gradedById String?

  @@unique([examId, studentId])
}
```

**FinalGrade (Nilai Akhir)**
```prisma
model FinalGrade {
  id             String       @id @default(cuid())
  classSubjectId String
  classSubject   ClassSubject @relation(...)
  studentId      String
  student        Student      @relation(...)
  academicYearId String
  academicYear   AcademicYear @relation(...)
  semester       Int          // 1 atau 2
  refAssignment  Float?       // rata-rata tugas (auto)
  refQuiz        Float?       // rata-rata quiz (auto)
  refExam        Float?       // rata-rata ujian (auto)
  refAttendance  Float?       // persentase kehadiran (auto)
  finalGrade     Int?         // nilai akhir manual guru
  notes          String?      @db.Text
  gradedAt       DateTime?
  gradedById     String?

  @@unique([classSubjectId, studentId, academicYearId, semester])
}
```

**Principal**
```prisma
model Principal {
  userId String @id
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  name   String
}
```

### Update Model Existing

**ClassSubject** — tambah `totalMeetings`:
```prisma
model ClassSubject {
  // ...existing fields...
  totalMeetings Int @default(16)
}
```

**School** — tambah relasi:
```prisma
model School {
  // ...existing fields...
  academicYears AcademicYear[]
}
```

---

## Rencana Endpoint Baru

### Admin
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/admin/academic-years` | List tahun ajaran |
| POST | `/admin/academic-years` | Buat tahun ajaran |
| PATCH | `/admin/academic-years/:id/activate` | Set tahun ajaran aktif |
| DELETE | `/admin/academic-years/:id` | Hapus tahun ajaran |

### Teacher
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/teacher/class-subjects/:id/meetings` | List pertemuan |
| POST | `/teacher/class-subjects/:id/meetings` | Buka pertemuan baru |
| PATCH | `/teacher/meetings/:id/close` | Tutup pertemuan |
| GET | `/teacher/meetings/:id/attendance` | Lihat attendance 1 pertemuan |
| PATCH | `/teacher/meetings/:id/attendance` | Bulk update status siswa |
| GET | `/teacher/class-subjects/:id/exams` | List ujian |
| POST | `/teacher/class-subjects/:id/exams` | Buat ujian |
| PATCH | `/teacher/exams/:id` | Update ujian |
| DELETE | `/teacher/exams/:id` | Hapus ujian |
| GET | `/teacher/exams/:id/grades` | Lihat daftar nilai ujian per siswa |
| PUT | `/teacher/exams/:id/grades` | Input/update nilai ujian (bulk) |
| GET | `/teacher/class-subjects/:id/final-grades?semester=1&academicYearId=` | Lihat nilai akhir + referensi |
| PUT | `/teacher/class-subjects/:id/final-grades` | Simpan nilai akhir (bulk) |

### Student
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/student/class-subjects/:id/attendance` | Lihat rekap absensi sendiri |

### Principal
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/principal/me` | Profil |
| GET | `/principal/classes` | List semua kelas |
| GET | `/principal/classes/:id` | Detail kelas |
| GET | `/principal/users` | List semua user |
| POST | `/principal/users/students` | Buat siswa |
| POST | `/principal/users/teachers` | Buat guru |
| PATCH | `/principal/users/students/:id` | Update siswa |
| PATCH | `/principal/users/teachers/:id` | Update guru |
| POST | `/principal/users/:id/reset-password` | Reset password |
| DELETE | `/principal/users/:id` | Hapus user |
| GET | `/principal/class-subjects/:id/final-grades` | Lihat nilai akhir per mapel |
| GET | `/principal/classes/:id/report` | Rekap nilai + absensi satu kelas |

---

## Urutan Implementasi

1. Schema + migration (semua model sekaligus)
2. `AcademicYear` di admin module
3. `Meeting` + `Attendance` di teacher module
4. `Exam` + `ExamGrade` di teacher module
5. `FinalGrade` di teacher module (referensi auto + input manual) + endpoint raport JSON
6. `Principal` module
7. Update `student` module — tambah endpoint attendance
