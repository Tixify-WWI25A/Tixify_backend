const pool = require('../config/db');

class DeleteEventHandler {
    async execute(req, res) {
      const { id } = req.params;

      try {
        const result = await pool.query('DELETE FROM events WHERE event_id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Event nicht gefunden.' });
        }

        return res.status(200).json({ message: 'Event erfolgreich gelöscht.' });
        } catch (err) {
          console.error('Fehler bei DeleteEventHandler:', err);
          return res.status(500).json({ error: 'Event konnte nicht gelöscht werden.' });
        }
    }
}

module.exports = DeleteEventHandler;