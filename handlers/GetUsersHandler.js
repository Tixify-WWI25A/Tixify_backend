const pool = require('../config/db');

class GetUsersHandler {
  async execute(req, res) {
    try {
      const result = await pool.query('SELECT * FROM users ORDER BY user_id ASC');
      
      const users = result.rows.map(u => ({
        id: u.user_id,
        name: u.name || u.username || 'Unbekannt',
        email: u.email,
        role: u.role,
        created_at: u.created_at
      }));

      return res.status(200).json(users);
    } catch (err) {
      console.error('Fehler in GetUsersHandler:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = GetUsersHandler;