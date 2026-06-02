# Lentera API Reference

Base URL: `http://localhost:3000/api/v1`

## Conventions

**Authentication**
Semua endpoint (kecuali login & refresh) butuh header:
```
Authorization: Bearer <accessToken>
```

**Error Format**
```json
{
  "statusCode": 401,
  "code": "INVALID_CREDENTIALS",
  "message": "NIS atau password salah",
  "timestamp": "2025-06-01T10:00:00.000Z",
  "path": "/api/v1/auth/student/login"
}
```

**Refresh Token**
Disimpan sebagai httpOnly cookie `lentera.refresh` secara otomatis oleh browser saat login. Tidak perlu dikelola manual kecuali untuk endpoint `/auth/refresh`.

---

## Phase 1 — Auth

### POST `/auth/student/login`

Login siswa menggunakan NIS + password.

**Auth:** Tidak perlu

**Request Body**
```json
{
  "nis": "12345678",
  "password": "password123"
}
```

**Response 200**
```json
{
  "accessToken": "eyJhbGci...",
  "user": {
    "id": "clx...",
    "role": "STUDENT",
    "mustChangePassword": false,
    "profile": {
      "name": "Rizky Aditya",
      "nis": "12345678",
      "class": "XII IPA 1",
      "school": "SMAN 1 Jakarta",
      "level": 3,
      "xp": 1240,
      "xpMax": 1300,
      "avatar": null
    }
  }
}
```

> `xpMax = 1000 + level * 100`. Cookie `lentera.refresh` di-set otomatis.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `INVALID_CREDENTIALS` | 401 | NIS atau password salah |
| `ACCOUNT_DISABLED` | 403 | Akun dinonaktifkan |

---

### POST `/auth/staff/login`

Login guru atau admin menggunakan email + password.

**Auth:** Tidak perlu

**Request Body**
```json
{
  "email": "ahmad@sman1jkt.sch.id",
  "password": "password123"
}
```

**Response 200 — Guru**
```json
{
  "accessToken": "eyJhbGci...",
  "user": {
    "id": "clx...",
    "role": "TEACHER",
    "mustChangePassword": false,
    "profile": {
      "name": "Pak Ahmad Fauzi",
      "nip": "198501012010011001",
      "title": "S.Pd.",
      "school": "SMAN 1 Jakarta",
      "avatar": null
    }
  }
}
```

**Response 200 — Admin**
```json
{
  "accessToken": "eyJhbGci...",
  "user": {
    "id": "clx...",
    "role": "ADMIN",
    "mustChangePassword": false,
    "profile": {
      "name": "Admin Sekolah",
      "scope": "SCHOOL",
      "school": "SMAN 1 Jakarta"
    }
  }
}
```

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `INVALID_CREDENTIALS` | 401 | Email atau password salah |
| `ACCOUNT_DISABLED` | 403 | Akun dinonaktifkan |

---

### GET `/auth/me`

Ambil profil user yang sedang login.

**Auth:** Required (semua role)

**Response 200** — sama seperti response login sesuai role.

---

### POST `/auth/logout`

Logout dan invalidate refresh token.

**Auth:** Required

**Request Body**
```json
{
  "refreshToken": "optional — jika dikirim, token spesifik di-revoke"
}
```

**Response 204** — Tidak ada body. Cookie `lentera.refresh` di-clear.

---

### POST `/auth/refresh`

Ambil access token baru menggunakan refresh token dari cookie.

**Auth:** Tidak perlu (menggunakan cookie `lentera.refresh`)

**Response 200**
```json
{
  "accessToken": "eyJhbGci..."
}
```

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `INVALID_REFRESH_TOKEN` | 401 | Token expired atau tidak ditemukan |

---

### POST `/auth/change-password`

Ganti password (diperlukan jika `mustChangePassword: true`).

**Auth:** Required (semua role)

**Request Body**
```json
{
  "currentPassword": "passwordLama",
  "newPassword": "passwordBaru123"
}
```

**Response 204** — Semua refresh token di-revoke, cookie di-clear. User harus login ulang.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `CURRENT_PASSWORD_WRONG` | 401 | Password saat ini salah |

---

## Phase 2 — Student Data

> Semua endpoint di bawah memerlukan `Authorization: Bearer <token>` dengan role `STUDENT`.

---

### GET `/students/me/profile`

Profil lengkap siswa yang login.

**Response 200**
```json
{
  "id": "clx...",
  "name": "Rizky Aditya",
  "nis": "12345678",
  "class": {
    "id": "clx...",
    "name": "XII IPA 1",
    "gradeYear": 12
  },
  "school": {
    "id": "clx...",
    "name": "SMAN 1 Jakarta",
    "code": "SMAN1JKT"
  },
  "level": 3,
  "xp": 1240,
  "xpMax": 1300,
  "avatar": null
}
```

---

### GET `/students/me/stats`

Statistik belajar siswa.

**Response 200**
```json
{
  "attendance": 92,
  "avgScore": 85,
  "completedAssignments": {
    "done": 4,
    "total": 5,
    "percent": 80
  },
  "weeklyDelta": {
    "avgScore": "+0",
    "completed": "+0"
  }
}
```

---

### GET `/students/me/badges`

Semua badge (dimiliki maupun belum).

**Response 200**
```json
[
  {
    "id": "FIRST_QUIZ",
    "label": "Quiz Pertama",
    "icon": "🎯",
    "earned": true,
    "earnedAt": "2025-05-20T08:00:00.000Z"
  },
  {
    "id": "PERFECT_SCORE",
    "label": "Nilai Sempurna",
    "icon": "⭐",
    "earned": false,
    "earnedAt": null
  }
]
```

---

### GET `/subjects`

Daftar semua mapel yang tersedia untuk kelas siswa, beserta progress chapter.

**Response 200**
```json
[
  {
    "id": "clx...",
    "name": "Matematika",
    "color": "blue",
    "icon": "math",
    "teacher": {
      "id": "clx...",
      "name": "Pak Ahmad Fauzi",
      "title": "S.Pd."
    },
    "chaptersTotal": 5,
    "chaptersDone": 3,
    "progress": 60,
    "currentChapter": "Integral Parsial"
  }
]
```

> `color` selalu lowercase: `blue | teal | yellow | mint | red | purple`

---

### GET `/subjects/:id`

Detail mapel beserta semua chapter dan status selesai per chapter.

**Response 200**
```json
{
  "id": "clx...",
  "name": "Matematika",
  "color": "blue",
  "icon": "math",
  "teacher": {
    "id": "clx...",
    "name": "Pak Ahmad Fauzi"
  },
  "chapters": [
    {
      "id": "clx...",
      "order": 1,
      "title": "Limit Fungsi",
      "completed": true,
      "completedAt": "2025-05-15T10:00:00.000Z"
    },
    {
      "id": "clx...",
      "order": 2,
      "title": "Turunan Fungsi",
      "completed": false,
      "completedAt": null
    }
  ]
}
```

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `SUBJECT_NOT_ACCESSIBLE` | 403 | Mapel bukan untuk kelas siswa |

---

### POST `/subjects/chapters/:chapterId/complete`

Tandai chapter sebagai selesai (idempotent).

**Response 204** — Tidak ada body.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `CHAPTER_NOT_FOUND` | 404 | Chapter tidak ditemukan |
| `CHAPTER_NOT_ACCESSIBLE` | 403 | Chapter bukan untuk kelas siswa |

---

### GET `/assignments`

Daftar tugas siswa dengan filter opsional.

**Query Params**
| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `status` | `segera \| belum \| selesai \| all` | — | Filter status. Tanpa param = semua |
| `subjectId` | string | — | Filter per mapel |

**Status Logic**
- `selesai` — sudah ada submission
- `segera` — belum dikumpul + due dalam 48 jam
- `belum` — belum dikumpul + due > 48 jam

**Response 200**
```json
[
  {
    "id": "clx...",
    "title": "Latihan Soal Turunan",
    "subject": {
      "id": "clx...",
      "name": "Matematika",
      "color": "blue"
    },
    "teacher": {
      "name": "Pak Ahmad Fauzi"
    },
    "type": "ONLINE",
    "totalItems": "10 soal",
    "maxScore": 100,
    "dueAt": "2025-06-10T23:59:00.000Z",
    "status": "belum",
    "score": null
  }
]
```

> `type`: `ONLINE | UPLOAD_FILE | ESSAY`

---

### GET `/assignments/:id`

Detail tugas lengkap beserta submission siswa (jika ada).

**Response 200**
```json
{
  "id": "clx...",
  "title": "Latihan Soal Turunan",
  "subject": { "id": "clx...", "name": "Matematika", "color": "blue" },
  "teacher": { "name": "Pak Ahmad Fauzi" },
  "type": "ESSAY",
  "description": "Kerjakan soal-soal berikut...",
  "instructions": ["Tuliskan langkah-langkah", "Gunakan bahasa baku"],
  "minWords": 200,
  "attachment": {
    "name": "soal.pdf",
    "sizeKB": 512,
    "url": "https://..."
  },
  "rubric": [
    { "label": "Ketepatan Jawaban", "max": 60 },
    { "label": "Penjelasan", "max": 40 }
  ],
  "maxScore": 100,
  "dueAt": "2025-06-10T23:59:00.000Z",
  "submission": {
    "kind": "ESSAY",
    "fileName": null,
    "fileSizeKB": null,
    "fileUrl": null,
    "essayText": "Turunan adalah...",
    "note": "Sudah saya kerjakan",
    "submittedAt": "2025-06-05T14:00:00.000Z",
    "score": 88,
    "feedback": "Bagus, tapi perlu lebih detail",
    "feedbackFrom": "Pak Ahmad Fauzi",
    "rubricBreakdown": null
  }
}
```

> `attachment` dan `submission` bisa `null`. `submission.kind`: `FILE | ESSAY | ONLINE_ANSWERS`

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `ASSIGNMENT_NOT_FOUND` | 404 | Tugas tidak ditemukan |
| `FORBIDDEN` | 403 | Tugas bukan untuk kelas siswa |

---

### POST `/assignments/:id/submit`

Kumpulkan tugas.

**Request Body — UPLOAD_FILE**
```json
{
  "fileUrl": "https://storage.../file.pdf",
  "fileName": "tugas-matematika.pdf",
  "fileSize": 524288,
  "note": "Terlampir tugas saya"
}
```

**Request Body — ESSAY**
```json
{
  "essayText": "Turunan adalah...",
  "note": "Optional catatan"
}
```

**Request Body — ONLINE**
```json
{
  "answers": {
    "soal-1": "B",
    "soal-2": "A"
  },
  "note": "Optional catatan"
}
```

**Response 201**
```json
{
  "submittedAt": "2025-06-05T14:00:00.000Z"
}
```

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `ALREADY_SUBMITTED` | 409 | Sudah pernah dikumpulkan |
| `INVALID_KIND` | 400 | Field wajib tidak lengkap |
| `ESSAY_TOO_SHORT` | 400 | Essay kurang dari `minWords` kata |

---

### GET `/quizzes`

Daftar semua quiz untuk kelas siswa.

**Response 200**
```json
[
  {
    "id": "clx...",
    "title": "Quiz Turunan Fungsi",
    "subject": { "id": "clx...", "name": "Matematika", "color": "blue" },
    "chapter": "Bab 2 - Turunan",
    "totalQuestions": 10,
    "durationMinutes": 30,
    "completed": true,
    "lastScore": 80,
    "lastStars": 4
  }
]
```

> `completed: false` berarti belum pernah submit. `lastScore` dan `lastStars` null jika belum selesai.

---

### POST `/quizzes/:id/start`

Mulai quiz dan dapatkan soal-soal. Jika ada sesi aktif yang belum expired, sesi lama dikembalikan (resume). Jika expired, sesi lama di-submit otomatis dan sesi baru dibuat.

**Response 200**
```json
{
  "sessionId": "clx...",
  "expiresAt": "2025-06-05T15:30:00.000Z",
  "durationSeconds": 1800,
  "questions": [
    {
      "id": "clx...",
      "order": 1,
      "text": "Turunan dari f(x) = x² adalah...",
      "options": [
        { "id": "a", "text": "x" },
        { "id": "b", "text": "2x" },
        { "id": "c", "text": "2" },
        { "id": "d", "text": "x²" }
      ]
    }
  ],
  "existingAnswers": {
    "clx-question-1": "b"
  }
}
```

> `correctOptionId` dan `explanation` **tidak pernah** ada di response ini.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `QUIZ_NOT_FOUND` | 404 | Quiz tidak ditemukan |
| `FORBIDDEN` | 403 | Quiz bukan untuk kelas siswa |

---

### PATCH `/quizzes/sessions/:sessionId/answer`

Simpan jawaban satu soal secara real-time (auto-save). Bisa dipanggil berkali-kali.

**Response 204** — Tidak ada body.

**Request Body**
```json
{
  "questionId": "clx...",
  "optionId": "b"
}
```

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `SESSION_NOT_FOUND` | 404 | Sesi tidak ditemukan |
| `ALREADY_SUBMITTED` | 410 | Quiz sudah dikumpulkan |
| `SESSION_EXPIRED` | 410 | Waktu habis |
| `NOT_OWNER` | 403 | Bukan sesi milik siswa ini |

---

### POST `/quizzes/sessions/:sessionId/submit`

Submit quiz dan dapatkan hasil. Idempotent — submit 2x mengembalikan hasil yang sama tanpa double XP.

**Request Body**
```json
{
  "answers": {
    "clx-question-1": "b",
    "clx-question-2": "a"
  }
}
```

**Response 200**
```json
{
  "sessionId": "clx...",
  "score": 80,
  "correct": 8,
  "incorrect": 1,
  "skipped": 1,
  "total": 10,
  "stars": 4,
  "timeUsedSeconds": 1243,
  "xpEarned": 80,
  "review": [
    {
      "questionId": "clx...",
      "text": "Turunan dari f(x) = x² adalah...",
      "options": [
        { "id": "a", "text": "x" },
        { "id": "b", "text": "2x" },
        { "id": "c", "text": "2" },
        { "id": "d", "text": "x²" }
      ],
      "myAnswer": "b",
      "correctOptionId": "b",
      "isCorrect": true,
      "explanation": "Karena turunan xⁿ = n·xⁿ⁻¹, maka turunan x² = 2x"
    }
  ]
}
```

> Stars: `≥90→5`, `≥80→4`, `≥70→3`, `≥60→2`, `else→1`. XP = `correct * 10`.

---

### GET `/quizzes/sessions/:sessionId`

Ambil hasil quiz yang sudah disubmit (untuk halaman review).

**Response 200** — Sama seperti response submit di atas.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `SESSION_NOT_FOUND` | 404 | Sesi tidak ditemukan atau belum disubmit |

---

### GET `/forum/posts`

Daftar post forum dengan cursor pagination.

**Query Params**
| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `cursor` | string | — | Cursor dari response sebelumnya untuk load more |
| `limit` | number | 20 | Max 50 |
| `subject` | string | — | Filter per subjectId. Kirim `umum` untuk filter post tanpa mapel |

**Response 200**
```json
{
  "items": [
    {
      "id": "clx...",
      "author": {
        "id": "clx...",
        "name": "Rizky Aditya",
        "initials": "RA",
        "role": "STUDENT",
        "avatarColor": "#E6F6FD"
      },
      "subject": {
        "id": "clx...",
        "name": "Matematika",
        "color": "blue"
      },
      "content": "Ada yang bisa bantu soal nomor 5?",
      "createdAt": "2025-06-01T10:00:00.000Z",
      "likeCount": 3,
      "replyCount": 2,
      "likedByMe": false,
      "savedByMe": false,
      "isPinned": false
    }
  ],
  "nextCursor": "MjAyNS0wNi0wMVQxMDowMDowMC4wMDBa"
}
```

> `subject` bisa `null` untuk post umum. `nextCursor` `null` jika tidak ada lagi data.

---

### POST `/forum/posts`

Buat post baru.

**Request Body**
```json
{
  "content": "Ada yang bisa bantu soal nomor 5?",
  "subjectId": "clx..."
}
```

> `subjectId` opsional. Jika diisi, mapel harus tersedia untuk kelas siswa.

**Response 201** — Post object sama seperti item di GET `/forum/posts`.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `SUBJECT_NOT_ACCESSIBLE` | 400 | Mapel tidak tersedia untuk siswa |

---

### GET `/forum/posts/:id`

Detail post beserta semua reply.

**Response 200**
```json
{
  "post": {
    "id": "clx...",
    "author": { "id": "clx...", "name": "Rizky Aditya", "initials": "RA", "role": "STUDENT", "avatarColor": "#E6F6FD" },
    "subject": { "id": "clx...", "name": "Matematika", "color": "blue" },
    "content": "Ada yang bisa bantu soal nomor 5?",
    "createdAt": "2025-06-01T10:00:00.000Z",
    "likeCount": 3,
    "replyCount": 2,
    "likedByMe": false,
    "savedByMe": false,
    "isPinned": false
  },
  "replies": [
    {
      "id": "clx...",
      "author": { "id": "clx...", "name": "Bu Sari Rahayu", "initials": "SR", "role": "TEACHER", "avatarColor": "#FEF9E7" },
      "content": "Coba pakai rumus limit L'Hopital",
      "createdAt": "2025-06-01T10:30:00.000Z"
    }
  ]
}
```

---

### POST `/forum/posts/:id/reply`

Balas post forum.

**Request Body**
```json
{
  "content": "Terima kasih kak!"
}
```

**Response 201**
```json
{
  "id": "clx...",
  "author": { "id": "clx...", "name": "Rizky Aditya", "initials": "RA", "role": "STUDENT", "avatarColor": "#E6F6FD" },
  "content": "Terima kasih kak!",
  "createdAt": "2025-06-01T11:00:00.000Z"
}
```

---

### POST `/forum/posts/:id/like`

Like post (idempotent).

**Response 204** — Tidak ada body.

---

### DELETE `/forum/posts/:id/like`

Unlike post.

**Response 204** — Tidak ada body.

---

### POST `/forum/posts/:id/save`

Simpan post (idempotent).

**Response 204** — Tidak ada body.

---

### DELETE `/forum/posts/:id/save`

Hapus dari tersimpan.

**Response 204** — Tidak ada body.

---

### GET `/forum/me/saved`

Daftar post yang disimpan, dengan cursor pagination.

**Query Params** — sama seperti `GET /forum/posts` (cursor, limit).

**Response 200** — sama seperti `GET /forum/posts`.

---

### GET `/schedule/today`

Jadwal pelajaran hari ini (berdasarkan waktu Jakarta UTC+7).

**Response 200**
```json
[
  {
    "id": "clx...",
    "subject": { "id": "clx...", "name": "Matematika", "color": "blue" },
    "room": "Kelas XII IPA 1",
    "timeStart": "07:00",
    "timeEnd": "08:30"
  }
]
```

> Mengembalikan array kosong `[]` jika tidak ada jadwal hari ini (misal hari Minggu).

---

### GET `/schedule/week`

Jadwal seluruh minggu, dikelompokkan per hari.

**Response 200**
```json
{
  "monday": [
    {
      "id": "clx...",
      "subject": { "id": "clx...", "name": "Matematika", "color": "blue" },
      "room": "Kelas XII IPA 1",
      "timeStart": "07:00",
      "timeEnd": "08:30"
    }
  ],
  "tuesday": [],
  "wednesday": [...],
  "thursday": [...],
  "friday": [...],
  "saturday": []
}
```

---

### GET `/leaderboard/class`

Leaderboard XP untuk kelas siswa yang login.

**Query Params**
| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `limit` | number | 10 | Max 20 |

**Response 200**
```json
[
  {
    "rank": 1,
    "name": "Aysha Putri",
    "initials": "AP",
    "xp": 2140,
    "avatarColor": "#F0FDF4",
    "isMe": false
  },
  {
    "rank": 2,
    "name": "Rizky Aditya",
    "initials": "RA",
    "xp": 1240,
    "avatarColor": "#E6F6FD",
    "isMe": true
  }
]
```

---

### GET `/notifications`

Daftar notifikasi dengan cursor pagination.

**Query Params**
| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `unreadOnly` | `true` | — | Kirim `true` untuk notif belum dibaca saja |
| `cursor` | string | — | Cursor untuk load more |
| `limit` | number | 20 | Max 50 |

**Response 200**
```json
{
  "items": [
    {
      "id": "clx...",
      "type": "ASSIGNMENT_GRADED",
      "title": "Tugas kamu sudah dinilai",
      "body": "Latihan Soal Turunan mendapat nilai 88",
      "linkTo": "/student/assignments/clx...",
      "readAt": null,
      "createdAt": "2025-06-01T10:00:00.000Z"
    }
  ],
  "nextCursor": "MjAyNS0wNi0wMVQxMDowMDowMC4wMDBa",
  "unreadCount": 2
}
```

> `type`: `ASSIGNMENT_NEW | ASSIGNMENT_GRADED | ASSIGNMENT_DUE_SOON | QUIZ_NEW | FORUM_REPLY | ANNOUNCEMENT`
> `unreadCount` selalu dikembalikan (terlepas dari filter `unreadOnly`), berguna untuk badge notifikasi.

---

### POST `/notifications/:id/read`

Tandai satu notifikasi sebagai sudah dibaca.

**Response 204** — Tidak ada body.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `NOTIF_NOT_FOUND` | 404 | Notifikasi tidak ditemukan atau bukan milik user ini |

---

### POST `/notifications/read-all`

Tandai semua notifikasi sebagai sudah dibaca.

**Response 204** — Tidak ada body.

---

### POST `/uploads/presign`

Minta pre-signed URL untuk upload file langsung ke storage. FE kemudian melakukan `PUT` ke `uploadUrl` dengan binary file.

**Request Body**
```json
{
  "purpose": "assignment_submission",
  "filename": "tugas-matematika.pdf",
  "sizeBytes": 524288,
  "mimeType": "application/pdf"
}
```

> `purpose`: `assignment_submission | avatar`

**File Rules**
| Purpose | Max Size | Tipe yang Diizinkan |
|---------|----------|---------------------|
| `assignment_submission` | 10 MB | pdf, doc, docx, jpg, png |
| `avatar` | 2 MB | jpg, png, webp |

**Response 200**
```json
{
  "uploadUrl": "https://storage.../assignment_submission/2025/06/clx.../1234567890.pdf?presigned=1",
  "fileKey": "assignment_submission/2025/06/clx.../1234567890.pdf",
  "expiresInSeconds": 900
}
```

> Setelah upload berhasil, kirim `fileKey` atau `uploadUrl` (tanpa query string) ke endpoint submit assignment.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `FILE_TOO_LARGE` | 400 | Ukuran melebihi batas |
| `INVALID_FILE_TYPE` | 400 | Tipe MIME tidak didukung |
| `STORAGE_NOT_CONFIGURED` | 501 | Storage belum dikonfigurasi (dev env) |

---

## Phase 3 — Teacher

Semua endpoint butuh token dengan `role: TEACHER`.

Base path: `/api/v1/teacher`

---

### GET `/teacher/me`

Profil guru yang sedang login.

**Response 200**
```json
{
  "id": "clx...",
  "name": "Pak Ahmad Fauzi",
  "nip": "1234567890",
  "title": "S.Pd., M.Pd.",
  "email": "ahmad@sman1jkt.sch.id",
  "avatar": null,
  "school": {
    "id": "clx...",
    "name": "SMAN 1 Jakarta",
    "code": "SMA001"
  }
}
```

---

### GET `/teacher/subjects`

Daftar kelas-mapel yang diajarkan guru ini.

**Response 200**
```json
[
  {
    "id": "clx...",
    "class": { "id": "clx...", "name": "XII IPA 1", "gradeYear": 12 },
    "subject": { "id": "clx...", "name": "Matematika", "color": "blue", "iconKey": "math" },
    "assignmentCount": 5,
    "quizCount": 3
  }
]
```

---

### GET `/teacher/subjects/:classSubjectId/students`

Daftar siswa di kelas-mapel tertentu.

**Response 200**
```json
[
  {
    "id": "clx...",
    "name": "Rizky Aditya",
    "nis": "12345678",
    "level": 3,
    "xp": 1240,
    "avatar": null
  }
]
```

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `CLASS_SUBJECT_NOT_FOUND` | 404 | Kelas-mapel tidak ditemukan |
| `FORBIDDEN` | 403 | Bukan kelas-mapel milik guru ini |

---

### GET `/teacher/assignments`

Daftar semua tugas yang dibuat guru ini.

**Query Params**
| Param | Tipe | Keterangan |
|-------|------|------------|
| `classSubjectId` | string | Filter per kelas-mapel |

**Response 200**
```json
[
  {
    "id": "clx...",
    "title": "Latihan Soal Turunan",
    "type": "UPLOAD_FILE",
    "maxScore": 100,
    "dueAt": "2025-06-10T16:00:00.000Z",
    "classSubject": {
      "id": "clx...",
      "class": "XII IPA 1",
      "subject": { "name": "Matematika", "color": "blue" }
    },
    "submissionCount": 12,
    "createdAt": "2025-06-01T08:00:00.000Z"
  }
]
```

---

### POST `/teacher/assignments`

Buat tugas baru. Otomatis kirim notifikasi `ASSIGNMENT_NEW` ke semua siswa di kelas.

**Request Body**
```json
{
  "classSubjectId": "clx...",
  "title": "Latihan Soal Turunan",
  "description": "Kerjakan soal-soal turunan berikut.",
  "instructions": ["Bacalah soal dengan teliti", "Tulis langkah-langkah penyelesaian"],
  "type": "UPLOAD_FILE",
  "maxScore": 100,
  "totalItems": null,
  "minWords": null,
  "attachmentUrl": "https://storage.../soal.pdf",
  "attachmentName": "soal-turunan.pdf",
  "attachmentSize": 524288,
  "rubric": [
    { "label": "Ketepatan Jawaban", "max": 70 },
    { "label": "Langkah Penyelesaian", "max": 30 }
  ],
  "dueAt": "2025-06-10T16:00:00.000Z"
}
```

> `type`: `ONLINE | UPLOAD_FILE | ESSAY`
> `rubric`: total `max` sebaiknya = `maxScore`

**Response 201**
```json
{
  "id": "clx...",
  "createdAt": "2025-06-01T08:00:00.000Z"
}
```

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `CLASS_SUBJECT_NOT_FOUND` | 404 | Kelas-mapel tidak ditemukan |
| `FORBIDDEN` | 403 | Bukan kelas-mapel milik guru ini |

---

### GET `/teacher/assignments/:id`

Detail tugas beserta jumlah pengumpulan.

**Response 200**
```json
{
  "id": "clx...",
  "title": "Latihan Soal Turunan",
  "description": "...",
  "instructions": ["..."],
  "type": "UPLOAD_FILE",
  "maxScore": 100,
  "totalItems": null,
  "minWords": null,
  "attachment": { "name": "soal.pdf", "sizeKB": 512, "url": "https://..." },
  "rubric": [{ "label": "Ketepatan Jawaban", "max": 70 }],
  "dueAt": "2025-06-10T16:00:00.000Z",
  "classSubject": {
    "id": "clx...",
    "class": "XII IPA 1",
    "subject": { "name": "Matematika", "color": "blue" }
  },
  "submissionCount": 12,
  "createdAt": "2025-06-01T08:00:00.000Z"
}
```

---

### PATCH `/teacher/assignments/:id`

Update sebagian field tugas. Semua field opsional.

**Request Body** — semua field opsional, kirim hanya yang berubah
```json
{
  "title": "Judul Baru",
  "dueAt": "2025-06-15T16:00:00.000Z"
}
```

**Response 204** — Tidak ada body.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `ASSIGNMENT_NOT_FOUND` | 404 | Tugas tidak ditemukan |
| `FORBIDDEN` | 403 | Bukan tugas milik guru ini |

---

### DELETE `/teacher/assignments/:id`

Hapus tugas. Gagal jika sudah ada siswa yang mengumpulkan.

**Response 204** — Tidak ada body.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `ASSIGNMENT_NOT_FOUND` | 404 | Tugas tidak ditemukan |
| `FORBIDDEN` | 403 | Bukan tugas milik guru ini |
| `HAS_SUBMISSIONS` | 409 | Sudah ada pengumpulan dari siswa |

---

### GET `/teacher/assignments/:id/submissions`

Daftar status pengumpulan semua siswa di kelas untuk tugas ini.

**Response 200**
```json
[
  {
    "student": { "id": "clx...", "name": "Rizky Aditya", "nis": "12345678" },
    "submitted": true,
    "submittedAt": "2025-06-05T10:30:00.000Z",
    "score": 88,
    "graded": true
  },
  {
    "student": { "id": "clx...", "name": "Aysha Putri", "nis": "12345679" },
    "submitted": false,
    "submittedAt": null,
    "score": null,
    "graded": false
  }
]
```

> Semua siswa di kelas dikembalikan, termasuk yang belum mengumpulkan (`submitted: false`).

---

### GET `/teacher/assignments/:id/submissions/:studentId`

Detail pengumpulan satu siswa tertentu.

**Response 200**
```json
{
  "student": { "id": "clx...", "name": "Rizky Aditya", "nis": "12345678" },
  "kind": "FILE",
  "fileName": "tugas-rizky.pdf",
  "fileSizeKB": 512,
  "fileUrl": "https://storage.../tugas-rizky.pdf",
  "essayText": null,
  "answers": null,
  "note": "Mohon dikoreksi pak",
  "submittedAt": "2025-06-05T10:30:00.000Z",
  "score": null,
  "feedback": null,
  "rubricBreakdown": null,
  "gradedAt": null
}
```

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `SUBMISSION_NOT_FOUND` | 404 | Siswa belum mengumpulkan |

---

### POST `/teacher/assignments/:id/submissions/:studentId/grade`

Nilai pengumpulan siswa. Otomatis kirim notifikasi `ASSIGNMENT_GRADED` ke siswa.

**Request Body**
```json
{
  "score": 88,
  "feedback": "Jawaban sudah baik, langkah penyelesaian perlu lebih detail.",
  "rubricBreakdown": [
    { "label": "Ketepatan Jawaban", "score": 62 },
    { "label": "Langkah Penyelesaian", "score": 26 }
  ]
}
```

> `feedback` dan `rubricBreakdown` opsional.
> `score` tidak boleh melebihi `maxScore` tugas.

**Response 204** — Tidak ada body.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `SUBMISSION_NOT_FOUND` | 404 | Siswa belum mengumpulkan |
| `SCORE_EXCEEDS_MAX` | 400 | Nilai melebihi batas maksimal |

---

### GET `/teacher/quizzes`

Daftar semua quiz yang dibuat guru ini.

**Query Params**
| Param | Tipe | Keterangan |
|-------|------|------------|
| `classSubjectId` | string | Filter per kelas-mapel |

**Response 200**
```json
[
  {
    "id": "clx...",
    "title": "Quiz Bab 3 — Turunan",
    "chapter": "Bab 3",
    "durationMinutes": 30,
    "totalQuestions": 10,
    "classSubject": {
      "id": "clx...",
      "class": "XII IPA 1",
      "subject": { "name": "Matematika", "color": "blue" }
    },
    "completedSessionCount": 15,
    "createdAt": "2025-06-01T08:00:00.000Z"
  }
]
```

---

### POST `/teacher/quizzes`

Buat quiz baru beserta soal-soalnya. Otomatis kirim notifikasi `QUIZ_NEW` ke semua siswa di kelas.

**Request Body**
```json
{
  "classSubjectId": "clx...",
  "title": "Quiz Bab 3 — Turunan",
  "chapter": "Bab 3",
  "durationMinutes": 30,
  "questions": [
    {
      "text": "Turunan dari f(x) = x² + 3x adalah...",
      "options": [
        { "id": "a", "text": "2x + 3" },
        { "id": "b", "text": "x + 3" },
        { "id": "c", "text": "2x" },
        { "id": "d", "text": "x² + 3" }
      ],
      "correctOptionId": "a",
      "explanation": "Turunan x² = 2x dan turunan 3x = 3, sehingga hasilnya 2x + 3.",
      "order": 1
    }
  ]
}
```

> `order` per soal opsional — jika tidak diisi, urutan sesuai array (1, 2, 3, ...).

**Response 201**
```json
{
  "id": "clx...",
  "createdAt": "2025-06-01T08:00:00.000Z"
}
```

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `CLASS_SUBJECT_NOT_FOUND` | 404 | Kelas-mapel tidak ditemukan |
| `FORBIDDEN` | 403 | Bukan kelas-mapel milik guru ini |

---

### GET `/teacher/quizzes/:id`

Detail quiz beserta semua soal (termasuk `correctOptionId` dan `explanation`).

**Response 200**
```json
{
  "id": "clx...",
  "title": "Quiz Bab 3 — Turunan",
  "chapter": "Bab 3",
  "durationMinutes": 30,
  "totalQuestions": 10,
  "classSubject": {
    "id": "clx...",
    "class": "XII IPA 1",
    "subject": { "name": "Matematika", "color": "blue" }
  },
  "questions": [
    {
      "id": "clx...",
      "order": 1,
      "text": "Turunan dari f(x) = x² + 3x adalah...",
      "options": [{ "id": "a", "text": "2x + 3" }],
      "correctOptionId": "a",
      "explanation": "Turunan x² = 2x dan turunan 3x = 3, sehingga hasilnya 2x + 3."
    }
  ],
  "createdAt": "2025-06-01T08:00:00.000Z"
}
```

---

### PATCH `/teacher/quizzes/:id`

Update metadata quiz dan/atau ganti seluruh soal. Semua field opsional.

**Request Body**
```json
{
  "title": "Judul Baru",
  "durationMinutes": 45,
  "questions": [...]
}
```

> Jika `questions` dikirim, **semua soal lama diganti** dengan soal baru. Tidak bisa update soal sebagian.

**Response 204** — Tidak ada body.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `QUIZ_NOT_FOUND` | 404 | Quiz tidak ditemukan |
| `FORBIDDEN` | 403 | Bukan quiz milik guru ini |

---

### DELETE `/teacher/quizzes/:id`

Hapus quiz. Gagal jika sudah ada siswa yang mengerjakan (session submitted).

**Response 204** — Tidak ada body.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `QUIZ_NOT_FOUND` | 404 | Quiz tidak ditemukan |
| `FORBIDDEN` | 403 | Bukan quiz milik guru ini |
| `HAS_SESSIONS` | 409 | Sudah ada siswa yang mengerjakan |

---

### GET `/teacher/quizzes/:id/sessions`

Hasil pengerjaan semua siswa di kelas untuk quiz ini.

**Response 200**
```json
[
  {
    "student": { "id": "clx...", "name": "Rizky Aditya", "nis": "12345678" },
    "attempted": true,
    "score": 80,
    "stars": 4,
    "correctCount": 8,
    "submittedAt": "2025-06-05T10:30:00.000Z"
  },
  {
    "student": { "id": "clx...", "name": "Aysha Putri", "nis": "12345679" },
    "attempted": false,
    "score": null,
    "stars": null,
    "correctCount": null,
    "submittedAt": null
  }
]
```

> Semua siswa di kelas dikembalikan, termasuk yang belum mengerjakan (`attempted: false`).

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `QUIZ_NOT_FOUND` | 404 | Quiz tidak ditemukan |
| `FORBIDDEN` | 403 | Bukan quiz milik guru ini |

---

## Phase 4 — Admin, Fitur Tambahan & Real-time

---

## Phase 4A — Admin

Semua endpoint butuh token dengan `role: ADMIN`. Base path: `/api/v1/admin`.

> Admin hanya bisa mengakses data sekolah miliknya sendiri (`schoolId` dari token).

---

### GET `/admin/me`

Profil admin yang sedang login.

**Response 200**
```json
{
  "id": "clx...",
  "name": "Admin SMAN 1 Jakarta",
  "scope": "SCHOOL",
  "email": "admin@sman1jkt.sch.id",
  "school": {
    "id": "clx...",
    "name": "SMAN 1 Jakarta",
    "code": "SMA001"
  }
}
```

> `scope`: `SCHOOL | SUPER`

---

### GET `/admin/users`

Daftar semua user di sekolah ini.

**Query Params**
| Param | Tipe | Keterangan |
|-------|------|------------|
| `role` | `STUDENT \| TEACHER` | Filter per role |
| `classId` | string | Filter siswa per kelas |

**Response 200**
```json
[
  {
    "id": "clx...",
    "role": "STUDENT",
    "email": null,
    "isActive": true,
    "mustChangePassword": true,
    "createdAt": "2025-06-01T08:00:00.000Z",
    "lastLoginAt": null,
    "profile": {
      "name": "Rizky Aditya",
      "nis": "12345678",
      "class": "XII IPA 1"
    }
  },
  {
    "id": "clx...",
    "role": "TEACHER",
    "email": "ahmad@sman1jkt.sch.id",
    "isActive": true,
    "mustChangePassword": false,
    "createdAt": "2025-06-01T08:00:00.000Z",
    "lastLoginAt": "2025-06-05T07:30:00.000Z",
    "profile": {
      "name": "Pak Ahmad Fauzi",
      "nip": "1234567890",
      "title": "S.Pd."
    }
  }
]
```

---

### POST `/admin/users/students`

Buat akun siswa baru. Password sementara dikembalikan ke admin untuk dibagikan ke siswa.

**Request Body**
```json
{
  "name": "Rizky Aditya",
  "nis": "12345678",
  "classId": "clx...",
  "email": "rizky@gmail.com",
  "password": "rahasia123"
}
```

> `email` dan `password` opsional. Jika `password` tidak diisi, sistem generate otomatis 8 karakter.

**Response 201**
```json
{
  "id": "clx...",
  "nis": "12345678",
  "name": "Rizky Aditya",
  "temporaryPassword": "a1b2c3d4"
}
```

> Simpan `temporaryPassword` dan bagikan ke siswa secara langsung. Tidak bisa diambil ulang. Siswa harus ganti password (`mustChangePassword: true`) saat login pertama.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `NIS_TAKEN` | 409 | NIS sudah digunakan |
| `EMAIL_TAKEN` | 409 | Email sudah digunakan |
| `CLASS_NOT_FOUND` | 404 | Kelas tidak ditemukan atau bukan milik sekolah ini |

---

### POST `/admin/users/teachers`

Buat akun guru baru.

**Request Body**
```json
{
  "name": "Pak Ahmad Fauzi",
  "nip": "1234567890",
  "title": "S.Pd., M.Pd.",
  "email": "ahmad@sman1jkt.sch.id",
  "password": "rahasia123"
}
```

> `nip`, `title`, `password` opsional.

**Response 201**
```json
{
  "id": "clx...",
  "email": "ahmad@sman1jkt.sch.id",
  "name": "Pak Ahmad Fauzi",
  "temporaryPassword": "a1b2c3d4"
}
```

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `EMAIL_TAKEN` | 409 | Email sudah digunakan |
| `NIP_TAKEN` | 409 | NIP sudah digunakan |

---

### GET `/admin/users/:id`

Detail satu user.

**Response 200**
```json
{
  "id": "clx...",
  "role": "STUDENT",
  "email": null,
  "isActive": true,
  "mustChangePassword": false,
  "createdAt": "2025-06-01T08:00:00.000Z",
  "lastLoginAt": "2025-06-05T10:00:00.000Z",
  "student": {
    "name": "Rizky Aditya",
    "nis": "12345678",
    "classId": "clx...",
    "class": "XII IPA 1",
    "level": 3,
    "xp": 1240
  },
  "teacher": null
}
```

---

### PATCH `/admin/users/students/:id`

Update data siswa (nama, kelas, atau status aktif).

**Request Body** — semua opsional
```json
{
  "name": "Rizky Aditya Baru",
  "classId": "clx...",
  "isActive": false
}
```

> `classId` digunakan untuk **pindah kelas** siswa.

**Response 204** — Tidak ada body.

---

### PATCH `/admin/users/teachers/:id`

Update data guru.

**Request Body** — semua opsional
```json
{
  "name": "Pak Ahmad",
  "nip": "1234567890",
  "title": "S.Pd.",
  "email": "newemail@sman1jkt.sch.id",
  "isActive": true
}
```

**Response 204** — Tidak ada body.

---

### POST `/admin/users/:id/reset-password`

Reset password user. Password baru dikembalikan ke admin.

**Request Body** — opsional
```json
{
  "newPassword": "passwordbaru123"
}
```

> Jika `newPassword` tidak diisi, sistem generate otomatis. User diset `mustChangePassword: true` dan semua sesi dihapus.

**Response 200**
```json
{
  "temporaryPassword": "x9y8z7w6"
}
```

---

### DELETE `/admin/users/:id`

Hapus user beserta semua datanya (cascade). Tidak bisa hapus akun sendiri.

**Response 204** — Tidak ada body.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `CANNOT_DELETE_SELF` | 403 | Tidak bisa menghapus akun sendiri |
| `USER_NOT_FOUND` | 404 | User tidak ditemukan |

---

### GET `/admin/classes`

Daftar semua kelas di sekolah ini.

**Response 200**
```json
[
  {
    "id": "clx...",
    "name": "XII IPA 1",
    "gradeYear": 12,
    "studentCount": 32,
    "subjectCount": 6
  }
]
```

---

### POST `/admin/classes`

Buat kelas baru.

**Request Body**
```json
{
  "name": "XII IPA 2",
  "gradeYear": 12
}
```

**Response 201**
```json
{
  "id": "clx...",
  "name": "XII IPA 2",
  "gradeYear": 12
}
```

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `CLASS_NAME_TAKEN` | 409 | Nama kelas sudah ada |

---

### PATCH `/admin/classes/:id`

Update nama atau tingkat kelas. Semua opsional.

**Response 204** — Tidak ada body.

---

### DELETE `/admin/classes/:id`

Hapus kelas. Gagal jika masih ada siswa.

**Response 204** — Tidak ada body.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `CLASS_HAS_STUDENTS` | 409 | Kelas masih memiliki siswa |

---

### GET `/admin/subjects`

Daftar semua mapel di sekolah ini.

**Response 200**
```json
[
  {
    "id": "clx...",
    "name": "Matematika",
    "shortName": "MTK",
    "color": "blue",
    "iconKey": "math",
    "classCount": 3,
    "chapterCount": 8
  }
]
```

---

### POST `/admin/subjects`

Buat mapel baru.

**Request Body**
```json
{
  "name": "Fisika",
  "shortName": "FIS",
  "color": "TEAL",
  "iconKey": "physics"
}
```

> `color`: `BLUE | TEAL | YELLOW | MINT | RED | PURPLE`

**Response 201** `{ "id": "clx...", "name": "Fisika" }`

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `SUBJECT_NAME_TAKEN` | 409 | Nama mapel sudah ada |

---

### PATCH `/admin/subjects/:id`

Update mapel. Semua opsional.

**Response 204** — Tidak ada body.

---

### DELETE `/admin/subjects/:id`

Hapus mapel. Gagal jika masih digunakan di kelas manapun.

**Response 204** — Tidak ada body.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `SUBJECT_IN_USE` | 409 | Mapel masih digunakan di kelas |

---

### GET `/admin/class-subjects`

Daftar penugasan guru ke kelas-mapel.

**Query Params**
| Param | Tipe | Keterangan |
|-------|------|------------|
| `classId` | string | Filter per kelas |

**Response 200**
```json
[
  {
    "id": "clx...",
    "class": { "id": "clx...", "name": "XII IPA 1" },
    "subject": { "id": "clx...", "name": "Matematika", "color": "blue" },
    "teacher": { "id": "clx...", "name": "Pak Ahmad Fauzi" },
    "assignmentCount": 5,
    "quizCount": 3
  }
]
```

---

### POST `/admin/class-subjects`

Tugaskan guru ke kombinasi kelas + mapel.

**Request Body**
```json
{
  "classId": "clx...",
  "subjectId": "clx...",
  "teacherId": "clx..."
}
```

**Response 201** `{ "id": "clx..." }`

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `CLASS_SUBJECT_EXISTS` | 409 | Mapel sudah ditugaskan di kelas ini |
| `CLASS_NOT_FOUND` / `SUBJECT_NOT_FOUND` / `TEACHER_NOT_FOUND` | 404 | Resource tidak ditemukan |

---

### PATCH `/admin/class-subjects/:id`

Ganti guru pengajar. Request body: `{ "teacherId": "clx..." }`

**Response 204** — Tidak ada body.

---

### DELETE `/admin/class-subjects/:id`

Hapus penugasan. Gagal jika sudah ada tugas atau quiz.

**Response 204** — Tidak ada body.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `CLASS_SUBJECT_IN_USE` | 409 | Masih ada tugas atau quiz di dalamnya |

---

### GET `/admin/schedule`

Daftar slot jadwal.

**Query Params:** `classId` (opsional)

**Response 200**
```json
[
  {
    "id": "clx...",
    "class": { "id": "clx...", "name": "XII IPA 1" },
    "subject": { "id": "clx...", "name": "Matematika", "color": "blue" },
    "dayOfWeek": 1,
    "timeStart": "07:00",
    "timeEnd": "08:30",
    "room": "R101"
  }
]
```

> `dayOfWeek`: `1=Senin … 6=Sabtu`

---

### POST `/admin/schedule`

Tambah slot jadwal.

**Request Body**
```json
{
  "classId": "clx...",
  "subjectId": "clx...",
  "dayOfWeek": 1,
  "timeStart": "07:00",
  "timeEnd": "08:30",
  "room": "R101"
}
```

**Response 201** `{ "id": "clx..." }`

---

### PATCH `/admin/schedule/:id`

Update slot. Semua field opsional (`subjectId`, `dayOfWeek`, `timeStart`, `timeEnd`, `room`).

**Response 204** — Tidak ada body.

---

### DELETE `/admin/schedule/:id`

Hapus slot jadwal.

**Response 204** — Tidak ada body.

---

### GET `/admin/subjects/:subjectId/chapters`

Daftar bab pada suatu mapel.

**Response 200**
```json
[
  {
    "id": "clx...",
    "order": 1,
    "title": "Bab 1 — Pengantar Turunan",
    "hasContent": true
  }
]
```

---

### POST `/admin/subjects/:subjectId/chapters`

Tambah bab ke mapel.

**Request Body**
```json
{
  "order": 1,
  "title": "Bab 1 — Pengantar Turunan",
  "content": "# Pengantar\n\n..."
}
```

> `content` opsional, bisa diisi nanti.

**Response 201** `{ "id": "clx...", "order": 1, "title": "..." }`

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `ORDER_TAKEN` | 409 | Nomor urut bab sudah ada |

---

### PATCH `/admin/subjects/:subjectId/chapters/:chapterId`

Update judul atau konten bab. Semua opsional.

**Response 204** — Tidak ada body.

---

### DELETE `/admin/subjects/:subjectId/chapters/:chapterId`

Hapus bab.

**Response 204** — Tidak ada body.

---

## Phase 4B — Fitur Tambahan Siswa

---

### PATCH `/students/me/avatar`

Update avatar siswa setelah upload ke storage via `POST /uploads/presign` (`purpose: avatar`).

**Auth:** `STUDENT`

**Request Body**
```json
{
  "avatarUrl": "https://storage.../avatar/clx.../photo.jpg"
}
```

**Response 204** — Tidak ada body.

---

### GET `/subjects/:subjectId/chapters/:chapterId`

Baca konten lengkap satu bab.

**Auth:** `STUDENT`

**Response 200**
```json
{
  "id": "clx...",
  "order": 1,
  "title": "Bab 1 — Pengantar Turunan",
  "content": "# Pengantar\n\nTurunan adalah...",
  "completed": true,
  "completedAt": "2025-06-03T14:00:00.000Z"
}
```

> `content` bisa `null` jika belum diisi. Render sebagai Markdown di FE.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `CHAPTER_NOT_FOUND` | 404 | Bab tidak ditemukan |
| `SUBJECT_NOT_ACCESSIBLE` | 403 | Mapel bukan untuk kelas siswa ini |

---

## Phase 4C — Fitur Tambahan Guru

---

### POST `/teacher/subjects/:classSubjectId/announce`

Broadcast pengumuman ke semua siswa di kelas. Membuat notifikasi `ANNOUNCEMENT` untuk tiap siswa.

**Auth:** `TEACHER`

**Request Body**
```json
{
  "title": "Jadwal Ulangan Berubah",
  "body": "Ulangan Bab 3 dipindah ke Jumat 13 Juni 2025."
}
```

**Response 204** — Tidak ada body.

---

### GET `/teacher/subjects/:classSubjectId/students/:studentId/progress`

Laporan kemajuan satu siswa: semua tugas, quiz, dan bab di kelas-mapel ini.

**Auth:** `TEACHER`

**Response 200**
```json
{
  "assignments": [
    {
      "id": "clx...",
      "title": "Latihan Soal Turunan",
      "dueAt": "2025-06-10T16:00:00.000Z",
      "submitted": true,
      "submittedAt": "2025-06-05T10:30:00.000Z",
      "score": 88,
      "graded": true
    }
  ],
  "quizzes": [
    {
      "id": "clx...",
      "title": "Quiz Bab 3",
      "attempted": true,
      "bestScore": 80,
      "bestStars": 4
    }
  ],
  "chapters": [
    {
      "id": "clx...",
      "order": 1,
      "title": "Bab 1 — Pengantar Turunan",
      "completed": true
    }
  ]
}
```

---

### PATCH `/teacher/subjects/:classSubjectId/chapters/:chapterId/content`

Guru menulis atau update konten bab (Markdown / HTML string).

**Auth:** `TEACHER`

**Request Body**
```json
{
  "content": "# Bab 1 — Pengantar\n\nTurunan fungsi f(x)..."
}
```

**Response 204** — Tidak ada body.

---

### GET `/teacher/assignments/:id/export`

Download rekap nilai tugas dalam format Excel (`.xlsx`).

**Auth:** `TEACHER`

**Response** — Binary file `.xlsx`

Kolom: No, Nama, NIS, Status (Belum/Terkumpul/Dinilai), Waktu Kumpul, Nilai, Feedback.

> Di FE cukup buat link `<a href="/api/v1/teacher/assignments/:id/export" download>` dengan header `Authorization`.
> Jika pakai fetch: set `responseType: blob` lalu trigger download manual.

---

### GET `/teacher/quizzes/:id/export`

Download rekap hasil quiz dalam format Excel (`.xlsx`).

**Auth:** `TEACHER`

**Response** — Binary file `.xlsx`

Kolom: No, Nama, NIS, Status, Nilai, Benar, Bintang, Waktu Submit.

---

## Phase 4D — Re-attempt Quiz

Field `maxAttempts` ditambahkan ke Quiz (default `1`).

**Guru set saat buat/update quiz:**
```json
{
  "maxAttempts": 3
}
```

**Behavior:**
- `maxAttempts: 1` (default) — hanya bisa mengerjakan sekali.
- `maxAttempts: 3` — bisa mengerjakan sampai 3 kali, skor yang ditampilkan adalah **skor terakhir**.

**Error jika batas habis:**
```json
{
  "statusCode": 403,
  "code": "MAX_ATTEMPTS_REACHED",
  "message": "Batas percobaan quiz telah tercapai"
}
```

---

## Phase 4E — Forum Moderation

---

### POST `/forum/posts/:id/pin`

Sematkan post. Hanya `TEACHER` atau `ADMIN`.

**Response 204** — Tidak ada body.

---

### DELETE `/forum/posts/:id/pin`

Lepas sematan. Hanya `TEACHER` atau `ADMIN`.

**Response 204** — Tidak ada body.

---

### DELETE `/forum/posts/:id`

Hapus post beserta semua balasannya. Bisa oleh **penulis**, `TEACHER`, atau `ADMIN`.

**Response 204** — Tidak ada body.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `POST_NOT_FOUND` | 404 | Post tidak ditemukan |
| `FORBIDDEN` | 403 | Bukan penulis dan bukan moderator |

---

### DELETE `/forum/posts/:id/replies/:replyId`

Hapus satu balasan. Bisa oleh **penulis balasan**, `TEACHER`, atau `ADMIN`.

**Response 204** — Tidak ada body.

**Error Codes**
| Code | Status | Keterangan |
|------|--------|------------|
| `REPLY_NOT_FOUND` | 404 | Balasan tidak ditemukan |
| `FORBIDDEN` | 403 | Bukan penulis dan bukan moderator |

---

## Phase 4F — WebSocket Push Notifications

**Endpoint:** `ws://localhost:3000/ws?token=<accessToken>`

> Production: ganti ke `wss://`.

**Setup FE (socket.io-client):**
```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/ws', {
  query: { token: accessToken },
  transports: ['websocket'],
});

socket.on('connect', () => console.log('Terhubung ke notification socket'));

socket.on('notification', (data) => {
  // tampilkan toast / update badge notifikasi
  console.log(data);
});

socket.on('disconnect', () => {
  // reconnect dengan access token baru setelah refresh
});
```

**Event `notification` payload:**
```json
{
  "type": "ASSIGNMENT_NEW",
  "title": "Tugas baru tersedia",
  "body": "Latihan Soal Turunan",
  "linkTo": "/student/assignments/clx..."
}
```

> `type`: `ASSIGNMENT_NEW | ASSIGNMENT_GRADED | ASSIGNMENT_DUE_SOON | QUIZ_NEW | FORUM_REPLY | ANNOUNCEMENT`

> Jika token expired, socket langsung disconnect. Reconnect setelah `POST /auth/refresh`.

---

## Phase 4G — Due-soon Notification (Otomatis)

Tidak ada endpoint FE. Server menjalankan cron job **setiap jam** yang mengirim notifikasi `ASSIGNMENT_DUE_SOON` ke siswa yang **belum mengumpulkan** tugas dengan deadline dalam **24 jam ke depan**.

Notifikasi ini muncul di `GET /notifications` seperti biasa dengan `type: "ASSIGNMENT_DUE_SOON"`.
