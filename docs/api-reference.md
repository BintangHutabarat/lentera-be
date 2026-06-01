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
