const jwt = require('jsonwebtoken');

function checkLogin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Nicht angemeldet. Bitte einloggen.' });
  }

  const secret = process.env.JWT_SECRET || 'tixify_super_secret_jwt_key_2026';

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Sitzung abgelaufen oder ungültig.' });
    }

    req.user = decoded;
    next();
  });
}

module.exports = checkLogin;