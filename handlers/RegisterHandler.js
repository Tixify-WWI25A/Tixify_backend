const pool = require('../config/db');
const bcrypt = require('bcrypt');

class RegisterHandler {
  async execute(req, res) {
    try {
      const username = req.body.username || req.body.name;
      const { email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Bitte alle Felder ausfüllen' });
      }

      // 1. Prüfen, ob User existiert (kein "SELECT id", sondern "SELECT 1" oder "*")
      const userCheck = await pool.query(
        'SELECT 1 FROM users WHERE email = $1',
        [email]
      );

      if (userCheck.rows.length > 0) {
        return res.status(400).json({ error: 'E-Mail ist bereits vergeben.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING user_id, username, email, role`,
        [username, email, hashedPassword, 'customer']
      );

      return res.status(201).json({
        message: 'Registrierung erfolgreich!',
        user: result.rows[0]
      });
    } catch (err) {
      console.error('Fehler bei RegisterHandler:', err);
      return res.status(500).json({ error: 'Serverfehler bei der Registrierung' });
    }
  }
}

module.exports = RegisterHandler;