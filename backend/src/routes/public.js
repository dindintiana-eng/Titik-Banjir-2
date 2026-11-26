const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const { RISK, getRiskLevel, getAccessAdvice } = require('../domain/flood');
const { uploadDirectory, uploadPhoto } = require('../middleware/upload');
const {
  HttpError,
  asyncRoute,
  requireFields,
  numberInRange,
  integerInRange,
  validDate
} = require('../utils/errors');

const router = express.Router();

const latestIncidentJoin = `
  LEFT JOIN kejadian_banjir e ON e.id_kejadian = (
    SELECT e2.id_kejadian
    FROM kejadian_banjir e2
    WHERE e2.id_lokasi = l.id_lokasi
      AND (
        e2.dikelola_admin = 1
        OR EXISTS (
          SELECT 1 FROM laporan lr
          WHERE lr.id_kejadian = e2.id_kejadian AND lr.status = 'verified'
        )
      )
    ORDER BY e2.tanggal_kejadian DESC, e2.id_kejadian DESC
    LIMIT 1
  )
  LEFT JOIN laporan r ON r.id_laporan = (
    SELECT r2.id_laporan
    FROM laporan r2
    WHERE r2.id_kejadian = e.id_kejadian AND r2.status = 'verified'
    ORDER BY r2.tanggal_laporan DESC, r2.id_laporan DESC
    LIMIT 1
  )`;

function formatLocation(row) {
  const risk = row.id_kejadian === null
    ? RISK.UNKNOWN
    : getRiskLevel(row.kedalaman_cm, row.durasi_jam);
  return {
    ...row,
    risiko: risk,
    rekomendasi_akses: getAccessAdvice(risk, row.kondisi_jalan)
  };
}

router.get('/locations', asyncRoute(async (req, res) => {
  const where = [];
  const values = [];
  if (req.query.search) {
    where.push('(l.nama_lokasi LIKE ? OR l.alamat LIKE ?)');
    const search = `%${String(req.query.search).slice(0, 100)}%`;
    values.push(search, search);
  }
  if (req.query.condition) {
    where.push('e.kondisi_jalan = ?');
    values.push(String(req.query.condition).slice(0, 100));
  }
  if (req.query.minDepth !== undefined && req.query.minDepth !== '') {
    where.push('e.kedalaman_cm >= ?');
    values.push(numberInRange(req.query.minDepth, 'minDepth', 0, 10000));
  }
  if (req.query.maxDepth !== undefined && req.query.maxDepth !== '') {
    where.push('e.kedalaman_cm <= ?');
    values.push(numberInRange(req.query.maxDepth, 'maxDepth', 0, 10000));
  }
  const query = `
    SELECT l.id_lokasi, l.nama_lokasi, l.alamat, l.latitude, l.longitude,
      e.id_kejadian, e.tanggal_kejadian, e.kedalaman_cm, e.durasi_jam,
      e.kondisi_jalan, e.keterangan AS keterangan_kejadian,
      r.foto, r.keterangan AS keterangan_laporan
    FROM lokasi l
    ${latestIncidentJoin}
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY l.nama_lokasi`;
  const [rows] = await pool.execute(query, values);
  const locations = rows
    .map(formatLocation)
    .filter((location) => !req.query.risk || location.risiko === req.query.risk);
  res.json({ data: locations });
}));

router.post('/reports', (req, res, next) => {
  uploadPhoto(req, res, (error) => {
    if (error) {
      if (req.file) fs.unlink(path.join(uploadDirectory, req.file.filename)).catch((unlinkError) => {
        console.error('Gagal membersihkan unggahan laporan:', unlinkError);
      });
      return next(error);
    }
    return next();
  });
}, asyncRoute(async (req, res) => {
  try {
    requireFields(req.body, ['id_lokasi', 'tanggal_kejadian', 'kedalaman_cm', 'durasi_jam']);
    const locationId = integerInRange(req.body.id_lokasi, 'id_lokasi', 1, Number.MAX_SAFE_INTEGER);
    const depth = numberInRange(req.body.kedalaman_cm, 'kedalaman_cm', 0, 10000);
    const duration = numberInRange(req.body.durasi_jam, 'durasi_jam', 0, 100000);
    const date = validDate(req.body.tanggal_kejadian, 'tanggal_kejadian');
    const reportDate = new Date().toISOString().slice(0, 10);
    const connection = await pool.getConnection();
    let incidentId;
    let reportId;
    try {
      await connection.beginTransaction();
      const [locations] = await connection.execute(
        'SELECT id_lokasi FROM lokasi WHERE id_lokasi = ? FOR UPDATE',
        [locationId]
      );
      if (!locations.length) throw new HttpError(404, 'Lokasi tidak ditemukan.');
      const [incident] = await connection.execute(
        `INSERT INTO kejadian_banjir
          (id_lokasi, tanggal_kejadian, kedalaman_cm, durasi_jam, kondisi_jalan, keterangan)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          locationId,
          date,
          depth,
          duration,
          String(req.body.kondisi_jalan || 'Belum diverifikasi').slice(0, 100),
          req.body.keterangan ? String(req.body.keterangan).slice(0, 5000) : null
        ]
      );
      incidentId = incident.insertId;
      const photoPath = req.file ? `/uploads/${req.file.filename}` : null;
      const [report] = await connection.execute(
        `INSERT INTO laporan
          (id_kejadian, tanggal_laporan, sumber_laporan, foto, keterangan, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [
          incidentId,
          reportDate,
          String(req.body.sumber_laporan || 'Masyarakat').slice(0, 100),
          photoPath,
          req.body.keterangan ? String(req.body.keterangan).slice(0, 5000) : null
        ]
      );
      reportId = report.insertId;
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.status(201).json({
      message: 'Laporan diterima dan menunggu verifikasi admin.',
      data: { id_kejadian: incidentId, id_laporan: reportId, status: 'pending' }
    });
  } catch (error) {
    if (req.file) {
      try {
        await fs.unlink(path.join(uploadDirectory, req.file.filename));
      } catch (unlinkError) {
        if (unlinkError.code !== 'ENOENT') console.error('Gagal membersihkan foto laporan:', unlinkError);
      }
    }
    throw error;
  }
}));

router.get('/analytics/summary', asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute(`
    SELECT COUNT(DISTINCT e.id_kejadian) AS total_kejadian,
      COUNT(DISTINCT e.id_lokasi) AS lokasi_terdampak,
      AVG(e.durasi_jam) AS rata_rata_durasi_jam,
      SUM(CASE WHEN e.kedalaman_cm >= 30 OR e.durasi_jam >= 3 THEN 1 ELSE 0 END) AS kejadian_bahaya,
      SUM(CASE WHEN e.kedalaman_cm >= 15 OR e.durasi_jam >= 1 THEN 1 ELSE 0 END) AS potensi_gangguan
    FROM kejadian_banjir e
    WHERE e.dikelola_admin = 1
      OR EXISTS (
        SELECT 1 FROM laporan r
        WHERE r.id_kejadian = e.id_kejadian AND r.status = 'verified'
      )`);
  res.json({ data: rows[0] });
}));

router.get('/analytics/hotspots', asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute(`
    SELECT l.id_lokasi, l.nama_lokasi, l.alamat, l.latitude, l.longitude,
      COUNT(DISTINCT e.id_kejadian) AS frekuensi_banjir,
      AVG(e.durasi_jam) AS rata_rata_durasi_jam,
      MAX(e.tanggal_kejadian) AS kejadian_terakhir
    FROM lokasi l
    JOIN kejadian_banjir e ON e.id_lokasi = l.id_lokasi
    WHERE e.dikelola_admin = 1
      OR EXISTS (
        SELECT 1 FROM laporan r
        WHERE r.id_kejadian = e.id_kejadian AND r.status = 'verified'
      )
    GROUP BY l.id_lokasi, l.nama_lokasi, l.alamat, l.latitude, l.longitude
    ORDER BY frekuensi_banjir DESC, l.nama_lokasi
    LIMIT 10`);
  res.json({ data: rows });
}));

router.get('/analytics/routes', asyncRoute(async (_req, res) => {
  const [rows] = await pool.execute(`
    SELECT l.id_lokasi, l.nama_lokasi, l.alamat, e.tanggal_kejadian,
      e.kondisi_jalan, e.kedalaman_cm, e.durasi_jam
    FROM lokasi l
    ${latestIncidentJoin}
    WHERE e.id_kejadian IS NOT NULL
    ORDER BY e.tanggal_kejadian DESC, l.nama_lokasi`);
  const data = rows.map((row) => {
    const risk = getRiskLevel(row.kedalaman_cm, row.durasi_jam);
    return { ...row, risiko: risk, rekomendasi: getAccessAdvice(risk, row.kondisi_jalan) };
  });
  res.json({
    message: 'Panduan berbasis kondisi titik yang terverifikasi; bukan navigasi rute jalan.',
    data
  });
}));

async function getExportRows() {
  const [rows] = await pool.execute(`
    SELECT e.id_kejadian, l.nama_lokasi, l.alamat, e.tanggal_kejadian,
      e.kedalaman_cm, e.durasi_jam, e.kondisi_jalan, e.keterangan
    FROM kejadian_banjir e
    JOIN lokasi l ON l.id_lokasi = e.id_lokasi
    WHERE e.dikelola_admin = 1
      OR EXISTS (
        SELECT 1 FROM laporan r
        WHERE r.id_kejadian = e.id_kejadian AND r.status = 'verified'
      )
    ORDER BY e.tanggal_kejadian DESC, e.id_kejadian DESC`);
  return rows;
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

router.get('/exports/incidents.csv', asyncRoute(async (_req, res) => {
  const rows = await getExportRows();
  const columns = [
    ['id_kejadian', 'ID kejadian'],
    ['nama_lokasi', 'Nama lokasi'],
    ['alamat', 'Alamat'],
    ['tanggal_kejadian', 'Tanggal kejadian'],
    ['kedalaman_cm', 'Kedalaman (cm)'],
    ['durasi_jam', 'Durasi (jam)'],
    ['kondisi_jalan', 'Kondisi jalan'],
    ['keterangan', 'Keterangan']
  ];
  const csv = [
    columns.map(([, label]) => csvCell(label)).join(','),
    ...rows.map((row) => columns.map(([key]) => csvCell(row[key])).join(','))
  ].join('\r\n');
  res
    .set('Content-Type', 'text/csv; charset=utf-8')
    .set('Content-Disposition', 'attachment; filename="rekap-risiko-banjir.csv"')
    .send(`\uFEFF${csv}`);
}));

router.get('/exports/incidents.pdf', asyncRoute(async (_req, res) => {
  const rows = await getExportRows();
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', 'attachment; filename="rekap-risiko-banjir.pdf"');
  doc.on('error', (error) => {
    if (res.headersSent) res.destroy(error);
    else res.status(500).json({ error: 'Gagal membuat laporan PDF.' });
  });
  doc.pipe(res);
  doc.fontSize(16).text('Rekap Risiko Banjir Terverifikasi', { underline: true });
  doc.moveDown(0.5).fontSize(9).text(
    'Data kejadian yang telah diverifikasi admin. Indikator ini bukan estimasi kerugian finansial.'
  );
  doc.moveDown();
  for (const row of rows) {
    if (doc.y > 730) doc.addPage();
    doc.fontSize(10).text(`${row.tanggal_kejadian} - ${row.nama_lokasi}`);
    doc.fontSize(9).text(
      `${row.alamat || 'Alamat tidak tersedia'} | Kedalaman: ${row.kedalaman_cm ?? 'N/A'} cm | ` +
      `Durasi: ${row.durasi_jam ?? 'N/A'} jam | Kondisi: ${row.kondisi_jalan || 'N/A'}`
    );
    if (row.keterangan) doc.text(String(row.keterangan).slice(0, 500));
    doc.moveDown(0.6);
  }
  doc.end();
}));

module.exports = router;
