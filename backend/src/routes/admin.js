const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const requireAdmin = require('../middleware/auth');
const { uploadDirectory } = require('../middleware/upload');
const {
  HttpError,
  asyncRoute,
  requireFields,
  numberInRange,
  integerInRange,
  validDate
} = require('../utils/errors');

const router = express.Router();

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

router.post('/login', asyncRoute(async (req, res) => {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password || !process.env.JWT_SECRET) {
    throw new HttpError(503, 'Kredensial admin belum dikonfigurasi pada environment backend.');
  }
  if (!safeEqual(req.body.username || '', username) || !safeEqual(req.body.password || '', password)) {
    throw new HttpError(401, 'Username atau password admin salah.');
  }
  const token = jwt.sign({ role: 'admin', username }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ data: { token, expiresIn: 28800 } });
}));

router.use(requireAdmin);

router.get('/locations', asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute('SELECT * FROM lokasi ORDER BY nama_lokasi');
  res.json({ data: rows });
}));

router.post('/locations', asyncRoute(async (req, res) => {
  requireFields(req.body, ['nama_lokasi', 'latitude', 'longitude']);
  const latitude = numberInRange(req.body.latitude, 'latitude', -90, 90);
  const longitude = numberInRange(req.body.longitude, 'longitude', -180, 180);
  const [result] = await pool.execute(
    `INSERT INTO lokasi (nama_lokasi, alamat, latitude, longitude, titik_lokasi)
     VALUES (?, ?, ?, ?, ST_GeomFromText(?, 4326, 'axis-order=long-lat'))`,
    [
      String(req.body.nama_lokasi).slice(0, 100),
      req.body.alamat ? String(req.body.alamat).slice(0, 255) : null,
      latitude,
      longitude,
      `POINT(${longitude} ${latitude})`
    ]
  );
  res.status(201).json({ data: { id_lokasi: result.insertId } });
}));

router.put('/locations/:id', asyncRoute(async (req, res) => {
  requireFields(req.body, ['nama_lokasi', 'latitude', 'longitude']);
  const id = integerInRange(req.params.id, 'id', 1, Number.MAX_SAFE_INTEGER);
  const latitude = numberInRange(req.body.latitude, 'latitude', -90, 90);
  const longitude = numberInRange(req.body.longitude, 'longitude', -180, 180);
  const [existing] = await pool.execute('SELECT id_lokasi FROM lokasi WHERE id_lokasi = ?', [id]);
  if (!existing.length) throw new HttpError(404, 'Lokasi tidak ditemukan.');
  await pool.execute(
    `UPDATE lokasi
     SET nama_lokasi = ?, alamat = ?, latitude = ?, longitude = ?,
       titik_lokasi = ST_GeomFromText(?, 4326, 'axis-order=long-lat')
     WHERE id_lokasi = ?`,
    [
      String(req.body.nama_lokasi).slice(0, 100),
      req.body.alamat ? String(req.body.alamat).slice(0, 255) : null,
      latitude,
      longitude,
      `POINT(${longitude} ${latitude})`,
      id
    ]
  );
  res.json({ message: 'Lokasi berhasil diperbarui.' });
}));

router.delete('/locations/:id', asyncRoute(async (req, res) => {
  const id = integerInRange(req.params.id, 'id', 1, Number.MAX_SAFE_INTEGER);
  const [result] = await pool.execute('DELETE FROM lokasi WHERE id_lokasi = ?', [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Lokasi tidak ditemukan.');
  res.json({ message: 'Lokasi berhasil dihapus.' });
}));

router.get('/incidents', asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute(`
    SELECT e.*, l.nama_lokasi
    FROM kejadian_banjir e
    JOIN lokasi l ON l.id_lokasi = e.id_lokasi
    ORDER BY e.tanggal_kejadian DESC, e.id_kejadian DESC`);
  res.json({ data: rows });
}));

router.post('/incidents', asyncRoute(async (req, res) => {
  requireFields(req.body, ['id_lokasi', 'tanggal_kejadian']);
  const locationId = integerInRange(req.body.id_lokasi, 'id_lokasi', 1, Number.MAX_SAFE_INTEGER);
  const depth = req.body.kedalaman_cm === '' || req.body.kedalaman_cm === null
    ? null
    : numberInRange(req.body.kedalaman_cm, 'kedalaman_cm', 0, 10000);
  const duration = req.body.durasi_jam === '' || req.body.durasi_jam === null
    ? null
    : numberInRange(req.body.durasi_jam, 'durasi_jam', 0, 100000);
  const [result] = await pool.execute(
    `INSERT INTO kejadian_banjir
      (id_lokasi, tanggal_kejadian, kedalaman_cm, durasi_jam, kondisi_jalan, keterangan, dikelola_admin)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [
      locationId,
      validDate(req.body.tanggal_kejadian, 'tanggal_kejadian'),
      depth,
      duration,
      req.body.kondisi_jalan ? String(req.body.kondisi_jalan).slice(0, 100) : null,
      req.body.keterangan ? String(req.body.keterangan).slice(0, 5000) : null
    ]
  );
  res.status(201).json({ data: { id_kejadian: result.insertId } });
}));

router.put('/incidents/:id', asyncRoute(async (req, res) => {
  requireFields(req.body, ['id_lokasi', 'tanggal_kejadian']);
  const id = integerInRange(req.params.id, 'id', 1, Number.MAX_SAFE_INTEGER);
  const locationId = integerInRange(req.body.id_lokasi, 'id_lokasi', 1, Number.MAX_SAFE_INTEGER);
  const depth = req.body.kedalaman_cm === '' || req.body.kedalaman_cm === null
    ? null
    : numberInRange(req.body.kedalaman_cm, 'kedalaman_cm', 0, 10000);
  const duration = req.body.durasi_jam === '' || req.body.durasi_jam === null
    ? null
    : numberInRange(req.body.durasi_jam, 'durasi_jam', 0, 100000);
  const [existing] = await pool.execute('SELECT id_kejadian FROM kejadian_banjir WHERE id_kejadian = ?', [id]);
  if (!existing.length) throw new HttpError(404, 'Kejadian tidak ditemukan.');
  await pool.execute(
    `UPDATE kejadian_banjir
     SET id_lokasi = ?, tanggal_kejadian = ?, kedalaman_cm = ?, durasi_jam = ?,
       kondisi_jalan = ?, keterangan = ?
     WHERE id_kejadian = ?`,
    [
      locationId,
      validDate(req.body.tanggal_kejadian, 'tanggal_kejadian'),
      depth,
      duration,
      req.body.kondisi_jalan ? String(req.body.kondisi_jalan).slice(0, 100) : null,
      req.body.keterangan ? String(req.body.keterangan).slice(0, 5000) : null,
      id
    ]
  );
  res.json({ message: 'Kejadian berhasil diperbarui.' });
}));

router.delete('/incidents/:id', asyncRoute(async (req, res) => {
  const id = integerInRange(req.params.id, 'id', 1, Number.MAX_SAFE_INTEGER);
  const [result] = await pool.execute('DELETE FROM kejadian_banjir WHERE id_kejadian = ?', [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Kejadian tidak ditemukan.');
  res.json({ message: 'Kejadian berhasil dihapus.' });
}));

router.get('/reports', asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute(`
    SELECT r.*, e.tanggal_kejadian, e.kedalaman_cm, e.durasi_jam, e.kondisi_jalan,
      l.nama_lokasi, l.alamat
    FROM laporan r
    JOIN kejadian_banjir e ON e.id_kejadian = r.id_kejadian
    JOIN lokasi l ON l.id_lokasi = e.id_lokasi
    ORDER BY r.tanggal_laporan DESC, r.id_laporan DESC`);
  res.json({ data: rows });
}));

router.patch('/reports/:id/status', asyncRoute(async (req, res) => {
  const id = integerInRange(req.params.id, 'id', 1, Number.MAX_SAFE_INTEGER);
  if (!['pending', 'verified', 'rejected'].includes(req.body.status)) {
    throw new HttpError(400, 'Status harus pending, verified, atau rejected.');
  }
  const [existing] = await pool.execute('SELECT id_laporan FROM laporan WHERE id_laporan = ?', [id]);
  if (!existing.length) throw new HttpError(404, 'Laporan tidak ditemukan.');
  await pool.execute(
    'UPDATE laporan SET status = ? WHERE id_laporan = ?',
    [req.body.status, id]
  );
  res.json({ message: 'Status laporan berhasil diperbarui.' });
}));

router.delete('/reports/:id', asyncRoute(async (req, res) => {
  const id = integerInRange(req.params.id, 'id', 1, Number.MAX_SAFE_INTEGER);
  const [rows] = await pool.execute('SELECT foto FROM laporan WHERE id_laporan = ?', [id]);
  if (!rows.length) throw new HttpError(404, 'Laporan tidak ditemukan.');
  await pool.execute('DELETE FROM laporan WHERE id_laporan = ?', [id]);
  let cleanupWarning;
  if (rows[0].foto) {
    const filename = path.basename(rows[0].foto);
    try {
      await fs.unlink(path.join(uploadDirectory, filename));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Laporan dihapus tetapi foto gagal dibersihkan:', error);
        cleanupWarning = 'Laporan dihapus, tetapi file foto gagal dibersihkan.';
      }
    }
  }
  res.json({
    message: cleanupWarning || 'Laporan berhasil dihapus.',
    ...(cleanupWarning ? { warning: cleanupWarning } : {})
  });
}));

module.exports = router;
