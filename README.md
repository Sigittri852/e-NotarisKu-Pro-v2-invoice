# e-NotarisKu Pro v2.0

Aplikasi Next.js untuk administrasi Akta Notaris & PPAT dengan tema biru, form dinamis per jenis akta, arsip dokumen digital, honorarium, cetak PDF melalui browser, dan export langsung ke template Excel.

## Fitur
- Dashboard profesional dengan logo timbangan dan jam real-time
- 15 jenis Akta Notaris dan 7 jenis Akta PPAT
- Form dinamis sesuai kategori dan jenis akta
- Mapping Excel PPAT/Notaris ke kolom register (nomor, tanggal, identitas, tanah, pajak, keterangan)
- Upload foto, PDF, Word, Excel, ZIP
- Cetak akta / simpan sebagai PDF dari browser
- Honorarium, laporan, profil kantor, pengguna, ganti password
- Prisma schema untuk SQLite; dapat diubah ke MySQL

## Menjalankan
```powershell
npm install
copy .env.example .env
npm run db:generate
npm run db:push
npm run dev
```
Buka http://localhost:3000 (atau port berikutnya jika 3000 terpakai).

## Catatan database
Versi demo masih memakai `data/akta.json` agar langsung berjalan tanpa konfigurasi. `prisma/schema.prisma` sudah tersedia untuk migrasi ke SQLite. Untuk MySQL, ubah provider datasource menjadi `mysql` dan isi `DATABASE_URL` MySQL.

## Fitur Invoice / Tagihan (Update)
- Menu baru **Invoice & Tagihan**.
- Membuat invoice langsung dari data Akta; nomor invoice otomatis `INV-YYYYMM-0001`.
- Rincian tagihan multi-baris, qty, harga, subtotal, diskon, PPN/pajak, dan total otomatis.
- Data klien, NIK, alamat, referensi nomor/jenis akta, jatuh tempo, status pembayaran, metode pembayaran, dan catatan.
- Status pembayaran: Belum Lunas, Sebagian, Lunas.
- Tampilan invoice profesional untuk cetak / simpan PDF melalui browser.
- Export **Word (.doc)** yang dapat dibuka di Microsoft Word.
- Data invoice tersimpan pada `data/invoices.json` dan API tersedia di `/api/invoices`.
