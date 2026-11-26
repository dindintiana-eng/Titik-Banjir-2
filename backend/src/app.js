require('dotenv').config();
const express = require('express');
const cors = require('cors');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const { uploadDirectory } = require('./middleware/upload');

const app = express();
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use('/uploads', express.static(uploadDirectory, { dotfiles: 'deny', index: false }));

app.get('/api/health', async (_req, res, next) => {
  try {
    const pool = require('./config/db');
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    next(error);
  }
});

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

app.use((error, _req, res, _next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Ukuran foto melebihi batas unggahan.' });
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Unggah maksimal satu foto menggunakan field "foto".' });
  }
  if (error.message === 'Foto harus berformat JPEG, PNG, atau WebP.') {
    return res.status(400).json({ error: error.message });
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'Lokasi atau kejadian yang dipilih tidak ditemukan.' });
  }
  if (error.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'Data masih digunakan oleh relasi lain dan tidak dapat dihapus.' });
  }
  if (error.code === 'ER_DUP_FIELDNAME') {
    return res.status(500).json({ error: 'Migrasi database terdeteksi sudah diterapkan atau tidak konsisten.' });
  }
  if (error.code === 'ER_BAD_FIELD_ERROR' && /status/i.test(error.sqlMessage || '')) {
    return res.status(503).json({ error: 'Skema moderasi belum tersedia. Jalankan migrasi database terlebih dahulu.' });
  }
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  return res.status(status).json({
    error: status >= 500 ? 'Terjadi kesalahan pada server.' : error.message
  });
});

module.exports = app;
