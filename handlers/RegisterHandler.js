const db = require('../config/db');
const bcrypt = require('bcrypt');

class RegisterHandler {
  async execute(req, res) {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Bitte alle Felder ausfüllen' });
    }

    try {
      const userCheck = await db.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email.toLowerCase(), username]
      );

      if (userCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Benutzername oder E-Mail bereits vergeben' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = await db.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, role',
        [username, email.toLowerCase(), passwordHash]
      );

      return res.status(201).json({
        message: 'Benutzer erfolgreich registriert!',
        user: newUser.rows[0]
      });
    } catch (error) {
      console.error('Fehler bei RegisterHandler:', error);
      return res.status(500).json({ error: 'Serverfehler bei der Registrierung' });
    }
  }
}

module.exports = RegisterHandler;