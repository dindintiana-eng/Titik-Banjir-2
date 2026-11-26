# Backend WebGIS Banjir

REST API Express untuk aplikasi WebGIS Balunijuk–Kampak. Jalankan backend dan frontend sebagai aplikasi terpisah.

## Menyiapkan database dan konfigurasi

1. Import `db_geospasial_banjir (1).sql` ke MySQL 8.4.
2. Jalankan satu kali migrasi `database/migrations/001_report_moderation.sql`, kemudian `database/migrations/002_admin_managed_incidents.sql`. Migrasi pertama mempertahankan laporan lama sebagai `verified` dan membuat laporan baru berstatus `pending`; migrasi kedua menandai kejadian yang dimasukkan admin tanpa menganggap laporan warga yang dihapus sebagai kejadian admin.
3. Salin `.env.example` menjadi `.env`, lalu tetapkan kredensial MySQL, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, dan `JWT_SECRET` acak minimal 32 karakter. Login admin memvalidasi `ADMIN_USERNAME` dan `ADMIN_PASSWORD` dari `.env`, bukan tabel akun MySQL. Jangan commit `.env`.
4. Jalankan `npm install`, kemudian `npm run dev`. API aktif pada `http://localhost:3000`.

## Endpoint

Endpoint laporan risiko publik membaca data terverifikasi saja.

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/health` | Status API dan koneksi MySQL |
| GET | `/api/locations?search=&condition=&minDepth=&maxDepth=&risk=` | Titik peta, kondisi terbaru yang terverifikasi, dan filter |
| POST | `/api/reports` | Kirim kejadian + laporan baru (`multipart/form-data`, foto field `foto`, opsional); status awal `pending` |
| GET | `/api/analytics/summary` | Ringkasan kejadian, lokasi terdampak, durasi rata-rata |
| GET | `/api/analytics/hotspots` | Sepuluh lokasi dengan frekuensi tertinggi |
| GET | `/api/analytics/routes` | Panduan tekstual dari kondisi jalan terverifikasi |
| GET | `/api/exports/incidents.csv` | Unduh ekspor CSV terverifikasi |
| GET | `/api/exports/incidents.pdf` | Unduh ekspor PDF terverifikasi |
| POST | `/api/admin/login` | Login admin, menghasilkan Bearer token 8 jam |
| GET/POST | `/api/admin/locations` | Daftar/tambah lokasi (admin) |
| PUT/DELETE | `/api/admin/locations/:id` | Perbarui/hapus lokasi (admin) |
| GET/POST | `/api/admin/incidents` | Daftar/tambah kejadian (admin) |
| PUT/DELETE | `/api/admin/incidents/:id` | Perbarui/hapus kejadian (admin) |
| GET | `/api/admin/reports` | Daftar laporan untuk moderasi (admin) |
| PATCH | `/api/admin/reports/:id/status` | Ubah status ke `pending`, `verified`, atau `rejected` (admin) |
| DELETE | `/api/admin/reports/:id` | Hapus laporan dan foto unggahan (admin) |

Semua endpoint di bawah `/api/admin` kecuali login memerlukan header `Authorization: Bearer <token>`. CRUD lokasi menerima `latitude`/`longitude` dan memperbarui kolom geometri sebagai `POINT(longitude latitude)` SRID 4326.

POST `/api/reports` memerlukan `id_lokasi`, `tanggal_kejadian` (`YYYY-MM-DD`), `kedalaman_cm`, dan `durasi_jam`; kejadian dan laporan dibuat dalam satu transaksi karena tabel laporan mewajibkan `id_kejadian`. Unggahan menerima JPEG/PNG/WebP hingga batas `MAX_UPLOAD_MB`.

## Kebijakan risiko

- **Aman**: kedalaman `<15 cm` dan durasi `<1 jam`.
- **Waspada**: kedalaman mulai `15 cm` atau durasi mulai `1 jam`.
- **Bahaya**: kedalaman mulai `30 cm` atau durasi mulai `3 jam`.
- Jika salah satu pengukuran tidak tersedia, klasifikasi menjadi `Belum diketahui`, bukan Aman.

Panduan rute hanya rekomendasi tekstual per titik dan bukan navigasi; dump tidak menyertakan jaringan jalan. Indikator analitik menggunakan frekuensi dan durasi kejadian terverifikasi, bukan estimasi nilai kerugian uang.

## Pemeriksaan

Jalankan `npm test` untuk uji batas klasifikasi risiko dan rekomendasi akses.
