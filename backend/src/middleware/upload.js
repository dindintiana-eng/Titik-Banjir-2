const crypto = require('node:crypto');
const path = require('node:path');
const multer = require('multer');

const uploadDirectory = path.resolve(__dirname, '..', '..', 'uploads');
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = file.mimetype === 'image/png'
      ? '.png'
      : file.mimetype === 'image/webp'
        ? '.webp'
        : '.jpg';
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

const uploadPhoto = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(new Error('Foto harus berformat JPEG, PNG, atau WebP.'));
    }
    return callback(null, true);
  }
}).single('foto');

module.exports = { uploadDirectory, uploadPhoto };
