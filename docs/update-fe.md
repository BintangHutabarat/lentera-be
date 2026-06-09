# FE Update Brief — YDIAH Features

Dokumen ini berisi ringkasan semua endpoint baru dan perubahan yang perlu diintegrasikan oleh FE setelah update YDIAH.

---

## Daftar Isi

1. [Perubahan Auth & Role](#1-perubahan-auth--role)
2. [Admin — Tahun Ajaran](#2-admin--tahun-ajaran)
3. [Admin — Buat Kepala Sekolah](#3-admin--buat-kepala-sekolah)
4. [Teacher — Pertemuan & Absensi](#4-teacher--pertemuan--absensi)
5. [Teacher — Ujian](#5-teacher--ujian)
6. [Teacher — Nilai Akhir](#6-teacher--nilai-akhir)
7. [Student — Rekap Absensi](#7-student--rekap-absensi)
8. [Principal Module (semua endpoint)](#8-principal-module)
9. [Error Codes Baru](#9-error-codes-baru)

---

## 1. Perubahan Auth & Role

### Role baru: `PRINCIPAL`

Enum `Role` sekarang memiliki 4 nilai: `STUDENT` | `TEACHER` | `ADMIN` | `PRINCIPAL`

Login tetap menggunakan endpoint yang sama. Setelah login, cek field `role` pada response untuk menentukan dashboard yang ditampilkan:

```
ADMIN      → dashboard admin (super admin, full access)
PRINCIPAL  → dashboard kepala sekolah (akses terbatas, lihat bawah)
TEACHER    → dashboard guru
STUDENT    → dashboard siswa
```

Tidak ada perubahan pada endpoint auth.

### Enum baru

```
AttendanceStatus: HADIR | SAKIT | IZIN | ALPHA
MeetingStatus:    OPEN  | CLOSED
```

---

## 2. Admin — Tahun Ajaran

Base path: `/admin/academic-years` · Role: `ADMIN`

### GET `/admin/academic-years`

Response:
```json
[
  { "id": "cuid", "label": "2025/2026", "isActive": true },
  { "id": "cuid", "label": "2024/2025", "isActive": false }
]
```

### POST `/admin/academic-years`

Request:
```json
{ "label": "2025/2026" }
```
> Format label wajib `YYYY/YYYY` (contoh `2025/2026`). Duplikat per sekolah ditolak.

Response `201`:
```json
{ "id": "cuid", "label": "2025/2026", "isActive": false }
```

### PATCH `/admin/academic-years/:id/activate`

Tidak ada request body. Response `204 No Content`.

> Hanya satu tahun ajaran yang bisa aktif. Endpoint ini otomatis menonaktifkan yang lain.

### DELETE `/admin/academic-years/:id`

Response `204 No Content`.

> Gagal (409) jika sudah ada nilai akhir yang tersimpan untuk tahun ajaran ini.

---

## 3. Admin — Buat Kepala Sekolah

### POST `/admin/users/principals`

Role: `ADMIN`

Request:
```json
{
  "name": "Dr. Ahmad",
  "email": "kepala@ydiah.com",
  "password": "opsional123"  // optional, min 6 karakter
}
```

> Jika `password` tidak diisi, sistem generate password acak dan dikembalikan di response.

Response `201`:
```json
{
  "id": "cuid",
  "name": "Dr. Ahmad",
  "email": "kepala@ydiah.com",
  "role": "PRINCIPAL",
  "temporaryPassword": "a3f9c1b2"  // hanya muncul jika password tidak diisi
}
```

---

## 4. Teacher — Pertemuan & Absensi

Base path: `/teacher` · Role: `TEACHER`

### GET `/teacher/class-subjects/:id/meetings`

Response:
```json
{
  "totalMeetings": 16,
  "meetings": [
    {
      "id": "cuid",
      "meetingNumber": 1,
      "status": "CLOSED",
      "startedAt": "2025-08-01T07:00:00.000Z",
      "endedAt": "2025-08-01T08:30:00.000Z",
      "studentCount": 30
    }
  ]
}
```

### POST `/teacher/class-subjects/:id/meetings`

Tidak ada request body.

Response `201`:
```json
{
  "id": "cuid",
  "meetingNumber": 2,
  "status": "OPEN",
  "startedAt": "2025-08-08T07:00:00.000Z",
  "studentCount": 30
}
```

> Gagal (409) jika masih ada pertemuan yang OPEN, atau jumlah pertemuan sudah mencapai `totalMeetings`.

> Saat dibuka, semua siswa di kelas otomatis mendapat record absensi dengan status default `ALPHA`.

### PATCH `/teacher/meetings/:id/close`

Tidak ada request body. Response `204 No Content`.

### GET `/teacher/meetings/:id/attendance`

Response:
```json
{
  "meeting": {
    "id": "cuid",
    "meetingNumber": 2,
    "status": "OPEN",
    "startedAt": "2025-08-08T07:00:00.000Z",
    "endedAt": null
  },
  "entries": [
    { "studentId": "cuid", "name": "Ahmad", "nis": "001", "status": "ALPHA" },
    { "studentId": "cuid", "name": "Budi",  "nis": "002", "status": "HADIR" }
  ]
}
```

### PATCH `/teacher/meetings/:id/attendance`

Request:
```json
{
  "entries": [
    { "studentId": "cuid", "status": "HADIR" },
    { "studentId": "cuid", "status": "SAKIT" }
  ]
}
```
> Status valid: `HADIR` | `SAKIT` | `IZIN` | `ALPHA`

> Gagal (409) jika pertemuan sudah `CLOSED`.

Response `204 No Content`.

---

## 5. Teacher — Ujian

Base path: `/teacher` · Role: `TEACHER`

### GET `/teacher/class-subjects/:id/exams`

Response:
```json
[
  {
    "id": "cuid",
    "title": "Ujian Tengah Semester",
    "description": null,
    "maxScore": 100,
    "date": "2025-09-15T00:00:00.000Z",
    "gradedCount": 28,
    "createdAt": "2025-09-01T00:00:00.000Z"
  }
]
```

### POST `/teacher/class-subjects/:id/exams`

Request:
```json
{
  "title": "Ujian Akhir Semester",
  "description": "Materi bab 1-8",  // optional
  "maxScore": 100,                    // optional, default 100
  "date": "2025-12-10"               // optional, format ISO string
}
```

Response `201`: `{ "id": "cuid" }`

### PATCH `/teacher/exams/:id`

Semua field optional:
```json
{
  "title": "...",
  "description": "...",
  "maxScore": 100,
  "date": "2025-12-10"
}
```
Response `204 No Content`.

### DELETE `/teacher/exams/:id`

Response `204 No Content`.

### GET `/teacher/exams/:id/grades`

Response:
```json
{
  "exam": {
    "id": "cuid",
    "title": "Ujian Akhir Semester",
    "maxScore": 100,
    "date": "2025-12-10T00:00:00.000Z"
  },
  "entries": [
    {
      "studentId": "cuid",
      "name": "Ahmad",
      "nis": "001",
      "score": 85,
      "notes": null,
      "gradedAt": "2025-12-11T10:00:00.000Z"
    },
    {
      "studentId": "cuid",
      "name": "Budi",
      "nis": "002",
      "score": null,
      "notes": null,
      "gradedAt": null
    }
  ]
}
```
> Semua siswa di kelas selalu muncul, `score: null` artinya belum dinilai.

### PUT `/teacher/exams/:id/grades`

Request:
```json
{
  "entries": [
    { "studentId": "cuid", "score": 85, "notes": "Bagus" },
    { "studentId": "cuid", "score": null }
  ]
}
```
> `score` tidak boleh melebihi `maxScore` exam. `score: null` untuk menghapus nilai.

Response `204 No Content`.

---

## 6. Teacher — Nilai Akhir

Base path: `/teacher` · Role: `TEACHER`

### GET `/teacher/class-subjects/:id/final-grades?academicYearId=&semester=`

Query params wajib: `academicYearId` (string), `semester` (1 atau 2)

Response:
```json
{
  "classSubjectId": "cuid",
  "academicYearId": "cuid",
  "academicYearLabel": "2025/2026",
  "semester": 1,
  "entries": [
    {
      "studentId": "cuid",
      "name": "Ahmad",
      "nis": "001",
      "refAssignment": 87.5,    // rata-rata (nilai/maxScore × 100) semua tugas, null jika belum ada
      "refQuiz": 72.0,          // rata-rata skor mentah quiz, null jika belum ada
      "refExam": 83.33,         // rata-rata (nilai/maxScore × 100) semua ujian, null jika belum ada
      "refAttendance": 93.75,   // persentase HADIR dari semua pertemuan, null jika belum ada
      "finalGrade": 85,         // nilai akhir yang sudah diinput guru, null jika belum
      "notes": "Perlu remedial",
      "gradedAt": "2025-12-20T00:00:00.000Z"
    }
  ]
}
```

> `ref*` dihitung real-time saat endpoint dipanggil, digunakan sebagai referensi saja.
> Guru tetap mengisi `finalGrade` secara manual.

### PUT `/teacher/class-subjects/:id/final-grades`

Request:
```json
{
  "academicYearId": "cuid",
  "semester": 1,
  "entries": [
    { "studentId": "cuid", "finalGrade": 85, "notes": "Baik" },
    { "studentId": "cuid", "finalGrade": null }
  ]
}
```
> `semester`: 1 atau 2. `finalGrade`: 0–100 atau null.

> Saat PUT, snapshot `ref*` saat itu juga ikut disimpan ke DB bersama `finalGrade`.

Response `204 No Content`.

---

## 7. Student — Rekap Absensi

### GET `/students/me/class-subjects/:id/attendance`

Role: `STUDENT`

Response:
```json
{
  "classSubjectId": "cuid",
  "subject": { "id": "cuid", "name": "Fiqih", "shortName": "FQ" },
  "totalMeetings": 16,
  "summary": {
    "total": 10,
    "hadir": 9,
    "sakit": 1,
    "izin": 0,
    "alpha": 0,
    "percentageHadir": 90.0
  },
  "meetings": [
    {
      "meetingId": "cuid",
      "meetingNumber": 1,
      "status": "HADIR",
      "date": "2025-08-01T07:00:00.000Z",
      "meetingStatus": "CLOSED"
    }
  ]
}
```
> `status` di tiap meeting adalah status absensi siswa yang login (`HADIR`/`SAKIT`/`IZIN`/`ALPHA`/`null`).
> `meetingStatus` adalah status pertemuan itu sendiri (`OPEN`/`CLOSED`).
> `percentageHadir: null` jika belum ada pertemuan.

---

## 8. Principal Module

Semua endpoint di bawah ini memerlukan role `PRINCIPAL`. Base path: `/principal`

### GET `/principal/me`

Response:
```json
{
  "id": "cuid",
  "name": "Dr. Ahmad",
  "email": "kepala@ydiah.com",
  "school": { "id": "cuid", "name": "YDIAH", "code": "YDIAH" }
}
```

### GET `/principal/users?role=STUDENT&classId=`

Query params optional: `role` (`STUDENT` atau `TEACHER`), `classId`

Response sama dengan `GET /admin/users`.

### POST `/principal/users/students`

Body sama dengan `POST /admin/users/students`. Response `201`.

### POST `/principal/users/teachers`

Body sama dengan `POST /admin/users/teachers`. Response `201`.

### GET `/principal/users/:id`

Response sama dengan `GET /admin/users/:id`.

### PATCH `/principal/users/students/:id`

Body sama dengan `PATCH /admin/users/students/:id`. Response `204`.

### PATCH `/principal/users/teachers/:id`

Body sama dengan `PATCH /admin/users/teachers/:id`. Response `204`.

### POST `/principal/users/:id/reset-password`

Body: `{ "newPassword": "optional123" }` — jika tidak diisi, password di-generate otomatis.

Response: `{ "temporaryPassword": "a3f9c1b2" }`

### DELETE `/principal/users/:id`

Response `204`. Gagal (409) jika guru masih memiliki class subjects.

> Principal **tidak bisa** manage akun ADMIN atau sesama PRINCIPAL.

### GET `/principal/classes`

Response:
```json
[
  {
    "id": "cuid",
    "name": "Kelas 1A",
    "gradeYear": 1,
    "studentCount": 30,
    "subjectCount": 7
  }
]
```

### GET `/principal/classes/:id`

Response:
```json
{
  "id": "cuid",
  "name": "Kelas 1A",
  "gradeYear": 1,
  "students": [
    { "id": "cuid", "name": "Ahmad", "nis": "001", "email": "...", "isActive": true, "level": 3, "xp": 450 }
  ],
  "classSubjects": [
    {
      "id": "cuid",
      "subject": { "id": "cuid", "name": "Fiqih", "shortName": "FQ", "color": "emerald", "iconKey": "book" },
      "teacher": { "userId": "cuid", "name": "Ust. Hamid", "title": "S.Pd" },
      "assignmentCount": 5,
      "quizCount": 3,
      "examCount": 2
    }
  ]
}
```

### GET `/principal/class-subjects/:id/final-grades?academicYearId=&semester=`

Response:
```json
{
  "classSubjectId": "cuid",
  "subject": { "id": "cuid", "name": "Fiqih", "shortName": "FQ" },
  "teacher": { "userId": "cuid", "name": "Ust. Hamid" },
  "academicYearLabel": "2025/2026",
  "semester": 1,
  "entries": [
    {
      "studentId": "cuid",
      "name": "Ahmad",
      "nis": "001",
      "refAssignment": 87.5,
      "refQuiz": 72.0,
      "refExam": 83.33,
      "refAttendance": 93.75,
      "finalGrade": 85,
      "notes": null,
      "gradedAt": "2025-12-20T00:00:00.000Z"
    }
  ]
}
```
> Berbeda dengan endpoint guru: `ref*` di sini diambil dari yang sudah tersimpan (snapshot saat guru input), bukan dihitung ulang real-time.

### GET `/principal/classes/:id/report?academicYearId=&semester=`

Endpoint rekap nilai satu kelas, digunakan untuk generate raport.

Response:
```json
{
  "classId": "cuid",
  "className": "Kelas 1A",
  "gradeYear": 1,
  "academicYearLabel": "2025/2026",
  "semester": 1,
  "subjects": [
    {
      "classSubjectId": "cuid",
      "subject": { "id": "cuid", "name": "Fiqih", "shortName": "FQ" },
      "teacher": { "userId": "cuid", "name": "Ust. Hamid" },
      "students": [
        {
          "studentId": "cuid",
          "name": "Ahmad",
          "nis": "001",
          "finalGrade": 85,
          "refAssignment": 87.5,
          "refQuiz": 72.0,
          "refExam": 83.33,
          "refAttendance": 93.75,
          "attendance": {
            "total": 14,
            "present": 13,
            "percentage": 92.86
          }
        }
      ]
    }
  ]
}
```

> BE hanya menyediakan JSON. FE bertanggung jawab untuk render ke PDF/Excel.

---

## 9. Error Codes Baru

| Code | Status | Keterangan |
|------|--------|------------|
| `ACADEMIC_YEAR_EXISTS` | 409 | Label tahun ajaran sudah ada di sekolah ini |
| `ACADEMIC_YEAR_NOT_FOUND` | 404 | Tahun ajaran tidak ditemukan |
| `ACADEMIC_YEAR_IN_USE` | 409 | Tidak bisa hapus, sudah ada nilai akhir |
| `MEETING_ALREADY_OPEN` | 409 | Masih ada pertemuan yang belum ditutup |
| `MEETING_LIMIT_REACHED` | 409 | Jumlah pertemuan sudah mencapai batas `totalMeetings` |
| `MEETING_NOT_FOUND` | 404 | Pertemuan tidak ditemukan |
| `MEETING_ALREADY_CLOSED` | 409 | Pertemuan sudah ditutup sebelumnya |
| `MEETING_CLOSED` | 409 | Tidak bisa update absensi, pertemuan sudah ditutup |
| `EXAM_NOT_FOUND` | 404 | Ujian tidak ditemukan |
| `SCORE_EXCEEDS_MAX` | 400 | Nilai melebihi `maxScore` ujian |
| `CLASS_HAS_CLASS_SUBJECTS` | 409 | Kelas tidak bisa dihapus karena masih punya mapel |
| `TEACHER_HAS_CLASS_SUBJECTS` | 409 | Guru tidak bisa dihapus, masih mengajar |
| `CANNOT_DELETE_SELF` | 403 | Principal tidak bisa hapus akun sendiri |
