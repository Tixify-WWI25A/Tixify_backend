const jwt = require('jsonwebtoken');

function checkLogin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : (authHeader && authHeader.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ error: 'Nicht angemeldet. Bitte einloggen.' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('FATAL: JWT_SECRET Umgebungsvariable fehlt!');
    return res.status(500).json({ error: 'Server-Konfigurationsfehler.' });
  }

  jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Sitzung abgelaufen oder ungültig.' });
    }

    req.user = decoded;
    next();
  });
}

module.exports = checkLogin;