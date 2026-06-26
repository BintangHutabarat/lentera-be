# Materi CMS — Rich Text + Lampiran (Design)

> Mengubah "Materi Pelajaran" guru dari feed item bertipe tunggal (TEXT / IMAGE / PDF)
> menjadi entri gaya CMS: satu materi = **Judul + Isi (rich text) + Lampiran pendukung**.

- **Tanggal:** 2026-06-26
- **Lingkup pass ini:** Frontend `lentera-fe`, **sisi guru** (buat, daftar, detail).
- **BE:** dikerjakan terpisah oleh pemilik repo `lentera_be`. Dokumen ini menetapkan
  kontrak API yang FE harapkan. Jika bentuk final BE berbeda, FE menyesuaikan.
- **Status:** disetujui untuk ditulis jadi rencana implementasi.

---

## 1. Masalah

Model materi saat ini: satu entri = satu tipe tunggal (Teks / Foto / PDF), ditampilkan
sebagai feed datar. Guru tidak bisa membuat satu "materi pelajaran" utuh yang berisi
penjelasan **plus** gambar/dokumen pendukung — harus dipecah jadi beberapa entri terpisah
yang tidak saling terhubung. Klien menginginkan pola seperti CMS (mis. menulis artikel):
judul, isi, lalu lampiran pendukung.

Selain itu, mekanisme upload lama bergantung pada MinIO (presign + PUT), yang tidak tersedia,
sehingga upload gagal. Pendekatan baru tidak memakai object storage.

## 2. Keputusan (hasil brainstorming)

| Keputusan | Pilihan |
| --- | --- |
| Struktur materi | **Judul + Isi wajib**, lampiran **opsional 0..N** |
| Format isi | **Rich text** (HTML) via editor WYSIWYG |
| Editor | **Tiptap** (`@tiptap/react` + `starter-kit` + `extension-link`) |
| Lampiran | Gambar (JPG/PNG/WebP) + PDF, **maks 5 file, 3 MB/file** |
| Penyimpanan lampiran | **base64 data URL** (tanpa MinIO/object storage), dicek di server |
| Sanitasi | `isomorphic-dompurify` sebelum render (`dangerouslySetInnerHTML`) |
| Pembagian kerja | FE oleh agen; **BE oleh pemilik repo** |
| Sisi siswa | **Phase 2** (setelah endpoint baca siswa BE siap) |

## 3. Model Data (acuan untuk BE)

```
MateriItem {
  id        String
  subjectId String          // classSubjectId
  title     String          // wajib
  body      String  @Text   // HTML rich text yang sudah disanitasi
  createdAt DateTime
  attachments MateriAttachment[]
}

MateriAttachment {
  id       String
  materiId String
  type     MateriType        // IMAGE | PDF
  content  String  @LongText // base64 data URL ("data:image/png;base64,...")
  fileName String
  order    Int               // urutan tampil
}
```

Field lama `MateriItem.type` dan `MateriItem.content` (model tipe-tunggal) **dihapus**.
Migrasi dijalankan oleh pemilik BE; fitur masih baru sehingga data lama minimal/none.

## 4. Kontrak API (yang diharapkan FE)

Base: `/teacher/subjects/:classSubjectId/materi`

### 4.1 List (ringan — tidak menyeret base64)
`GET /teacher/subjects/:classSubjectId/materi`
```jsonc
[
  {
    "id": "…",
    "title": "Bab 3 — Tata Cara Wudhu",
    "excerpt": "Wudhu adalah …",   // teks polos hasil strip HTML, dipotong server
    "attachmentCount": 2,
    "createdAt": "2026-06-26T…"
  }
]
```

### 4.2 Detail (penuh)
`GET /teacher/subjects/:classSubjectId/materi/:materiId`
```jsonc
{
  "id": "…",
  "title": "…",
  "body": "<p>…</p>",            // HTML
  "attachments": [
    { "id": "…", "type": "IMAGE", "content": "data:image/png;base64,…", "fileName": "diagram.png" }
  ],
  "createdAt": "2026-06-26T…"
}
```

### 4.3 Buat
`POST /teacher/subjects/:classSubjectId/materi`
```jsonc
{
  "title": "…",
  "body": "<p>…</p>",
  "attachments": [
    { "type": "IMAGE", "content": "data:image/jpeg;base64,…", "fileName": "foto.jpg" },
    { "type": "PDF",   "content": "data:application/pdf;base64,…", "fileName": "ringkasan.pdf" }
  ]
}
```
Validasi server: `title` & `body` non-kosong; `attachments` ≤ 5; tiap file ≤ 3 MB (ukuran
ter-decode); mime IMAGE ∈ {jpeg,png,webp}, PDF = application/pdf. Kode error:
`FILE_TOO_LARGE`, `INVALID_FILE_TYPE`, dan (opsional) `PAYLOAD_TOO_LARGE`.

### 4.4 Hapus
`DELETE /teacher/subjects/:classSubjectId/materi/:materiId` (sudah ada).

> Edit materi **belum** masuk pass ini (YAGNI). Bisa jadi fast-follow.

## 5. Arsitektur FE

Param rute `kelas/[id]` di area ini = **classSubjectId** (sesuai kode saat ini).

### 5.1 Layar
1. **Daftar** — `app/teacher/kelas/[id]/materi/page.tsx` (rewrite)
   - Kartu: judul (tebal), `excerpt` (≤2 baris), meta "📎 N lampiran · tanggal".
   - Tombol **+** → `…/materi/buat`. Filter tipe lama dihapus.
   - Empty state dipertahankan.
2. **Detail** — `app/teacher/kelas/[id]/materi/[materiId]/page.tsx` (baru)
   - Judul → `<RichContent html={body} />` → daftar lampiran (gambar thumbnail klik untuk
     buka; PDF baris ikon + nama, klik buka di tab baru). Tombol hapus materi.
3. **Buat** — `app/teacher/kelas/[id]/materi/buat/page.tsx` (baru)
   - Input Judul → `<RichTextEditor />` (toolbar: bold, italic, bullet/ordered list,
     heading, link) → pemilih lampiran (multi; preview thumbnail gambar / kartu PDF;
     hapus per item; validasi ≤5 & mime & 3 MB sebelum encode).
   - Submit: encode tiap file → base64 data URL → `createTeacherMateri`. Tombol simpan
     nonaktif sampai judul & isi terisi; state `submitting`.

Buat/detail memakai **halaman penuh** (bukan bottom-sheet) karena editor + lampiran butuh
ruang.

### 5.2 Komponen
- `components/materi/RichTextEditor.tsx` — wrapper Tiptap, `value`/`onChange` HTML.
- `components/materi/RichContent.tsx` — `DOMPurify.sanitize(html)` lalu render; styling
  `.rich-content` (p, h2/h3, ul/ol, strong/em, a) ditambahkan di `globals.css`.
- `components/materi/AttachmentPicker.tsx` — kelola daftar File terpilih + preview + hapus
  + validasi; expose `attachments` siap-encode.

### 5.3 Service `lib/services/teacher.ts`
- Ganti `MateriItem` → `{ id, title, body, attachments, createdAt }`.
- Tambah `MateriListItem` `{ id, title, excerpt, attachmentCount, createdAt }`.
- Tambah `MateriAttachment` `{ id?, type, content, fileName }`.
- `getTeacherMateri(csId): MateriListItem[]`.
- `getTeacherMateriDetail(csId, materiId): MateriItem` (baru).
- `createTeacherMateri(csId, { title, body, attachments })`.
- `deleteTeacherMateri` tetap.
- `CreateMateriPayload` lama `{ type, content, fileName }` dihapus.

### 5.4 Dependency baru
`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `isomorphic-dompurify`.

## 6. Keamanan
Body adalah HTML buatan guru. **Selalu** sanitasi dengan DOMPurify di FE sebelum
`dangerouslySetInnerHTML`. BE disarankan juga menyanitasi sebelum simpan (defense in depth).
Allowlist tag: p, br, strong, em, u, h2, h3, ul, ol, li, a[href]. Drop script/style/event-handler.

## 7. Yang TIDAK termasuk (out of scope pass ini)
- Edit materi (hanya buat + hapus).
- Render sisi siswa (Phase 2).
- Reorder lampiran via drag (urutan = urutan pilih).
- Kompresi/resize gambar, anti-virus, CDN.
- Migrasi data materi lama (diasumsikan minimal; ditangani BE).

## 8. Rencana verifikasi
- `tsc --noEmit` + `eslint` bersih.
- `next build` sukses (route baru ter-generate).
- Manual: buat materi judul+isi tanpa lampiran; dengan 1 gambar; dengan 5 file campuran;
  tolak file ke-6 / >3MB / mime salah; detail merender body + lampiran; hapus materi.
