const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class LoginHandler {
  async execute(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('FATAL: JWT_SECRET ist nicht konfiguriert.');
      return res.status(500).json({ error: 'Server-Konfigurationsfehler.' });
    }

    try {
      const result = await pool.query(
        'SELECT user_id, username, email, password_hash, role FROM users WHERE email = $1',
        [email.trim().toLowerCase()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
      }

      const user = result.rows[0];

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
      }

      const token = jwt.sign(
        { userId: user.user_id, email: user.email, role: user.role },
        jwtSecret,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      return res.status(200).json({
        message: 'Login erfolgreich.',
        token,
        user: {
          id: user.user_id,
          name: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      console.error('Fehler bei LoginHandler:', err);
      return res.status(500).json({ error: 'Serverfehler beim Login.' });
    }
  }
}

module.exports = LoginHandler;