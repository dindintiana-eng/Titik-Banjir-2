# WebGIS Risiko Banjir Balunijuk–Kampak

Aplikasi WebGIS ini terdiri dari dua aplikasi terpisah:

- `backend/`: REST API Express, MySQL (`mysql2`), unggah foto (`multer`), serta ekspor CSV/PDF.
- `frontend/`: React, Tailwind CSS, dan React-Leaflet.

## Menjalankan aplikasi

1. Import [database SQL](./db_geospasial_banjir%20(1).sql) ke MySQL 8.4 dan jalankan satu kali migrasi [status moderasi](./backend/database/migrations/001_report_moderation.sql), lalu [penanda kejadian admin](./backend/database/migrations/002_admin_managed_incidents.sql).
2. Terminal pertama: buka `backend/`, salin `.env.example` sebagai `.env`, sesuaikan kredensial, jalankan `npm install`, lalu `npm run dev`.
3. Terminal kedua: buka `frontend/`, jalankan `npm install`, lalu `npm run dev`.
4. Buka `http://localhost:5173`. Kredensial admin diatur melalui `ADMIN_USERNAME` dan `ADMIN_PASSWORD` pada `.env` backend.

Rincian endpoint, kebijakan risiko, dan batasan data ada di [dokumentasi backend](./backend/README.md).
