const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const allowedTypes = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp'
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const extension = allowedTypes[file.mimetype];
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes[file.mimetype]) {
      return callback(new Error('Formato inválido. Envie PNG, JPG ou WEBP.'));
    }
    callback(null, true);
  }
});

module.exports = { upload, uploadDir };
