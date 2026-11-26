const jwt = require('jsonwebtoken');

function requireAdmin(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Autentikasi admin diperlukan.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Akses admin ditolak.' });
    }
    req.admin = payload;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
    }
    return next(error);
  }
}

module.exports = requireAdmin;
