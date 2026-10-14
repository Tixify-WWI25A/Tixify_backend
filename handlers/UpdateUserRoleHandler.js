const pool = require('../config/db');

class UpdateUserRoleHandler {
  async execute(req, res) {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Rolle muss angegeben werden.' });
    }

    try {
      const result = await pool.query(
        'UPDATE users SET role = $1 WHERE user_id = $2 RETURNING user_id AS id, username AS name, email, role',
        [role, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Nutzer nicht gefunden' });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error('Fehler in UpdateUserRoleHandler:', err);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = UpdateUserRoleHandler;