const pool = require('../config/db');

class GetEventsHandler {
  async execute(req, res) {
    const { search, location, maxPrice } = req.query;

    try {
      let query = 'SELECT * FROM events WHERE 1=1';
      const params = [];

      if (search) {
        params.push(`%${search}%`);
        query += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length})`;
      }

      if (location && location !== 'Alle Orte') {
        params.push(location);
        query += ` AND location = $${params.length}`;
      }

      if (maxPrice) {
        params.push(parseFloat(maxPrice));
        query += ` AND price <= $${params.length}`;
      }

      query += ' ORDER BY event_date ASC';

      const result = await pool.query(query, params);
      return res.status(200).json(result.rows);
    } catch (err) {
      console.error('Fehler bei GetEventsHandler:', err);
      return res.status(500).json({ error: 'Events konnten nicht geladen werden.' });
    }
  }
}

module.exports = GetEventsHandler;