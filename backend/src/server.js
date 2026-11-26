require('dotenv').config();
const fs = require('node:fs');
const app = require('./app');
const pool = require('./config/db');
const { uploadDirectory } = require('./middleware/upload');

const port = Number(process.env.PORT || 3000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET harus diatur dengan minimal 32 karakter.');
}
fs.mkdirSync(uploadDirectory, { recursive: true });

const server = app.listen(port, () => {
  console.log(`WebGIS API aktif pada http://localhost:${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} diterima, menutup server...`);
  server.close(async (serverError) => {
    if (serverError) {
      console.error('Gagal menutup server HTTP:', serverError);
      process.exitCode = 1;
    }
    try {
      await pool.end();
    } catch (error) {
      console.error('Gagal menutup koneksi database:', error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
