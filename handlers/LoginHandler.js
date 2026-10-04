const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class LoginHandler {
  async execute(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-Mail und Passwort erforderlich.' });
    }

    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
      }

      const user = result.rows[0];
      const hash = user.password_hash || user.password;

      if (!hash) {
        return res.status(500).json({ error: 'Kein Passwort-Hash vorhanden.' });
      }

      const match = await bcrypt.compare(password, hash);
      if (!match) {
        return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
      }

      const token = jwt.sign(
        { userId: user.user_id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'tixify_super_secret_jwt_key_2026',
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        message: 'Login erfolgreich.',
        token,
        user: {
          id: user.user_id,
          name: user.username || user.name,
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