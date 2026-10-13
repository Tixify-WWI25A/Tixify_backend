const pool = require('../config/db');

class DeleteUserHandler {
  async execute(req, res) {
    const { id } = req.params;

    try {
      const result = await pool.query(
        'DELETE FROM users WHERE user_id = $1 RETURNING user_id AS id',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Nutzer nicht gefunden' });
      }

      res.json({ message: `Nutzer #${id} erfolgreich gelöscht.` });
    } catch (err) {
      console.error('Fehler in DeleteUserHandler:', err);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = DeleteUserHandler;