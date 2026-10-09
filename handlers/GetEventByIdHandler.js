const pool = require('../config/db');

class GetEventByIdHandler {
  async execute(req, res) {
    const { id } = req.params;

    try {
      const result = await pool.query('SELECT * FROM events WHERE event_id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Event nicht gefunden.' });
      }

      return res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error('Fehler bei GetEventByIdHandler:', err);
      return res.status(500).json({ error: 'Event-Details konnten nicht geladen werden.' });
    }
  }
}

module.exports = GetEventByIdHandler;


            