const pool = require('../config/db');

class UpdateEventHandler {
  async execute(req, res) {
    const { id } = req.params;
    const {
      title,
      description,
      location,
      category,
      event_date,
      price,
      logo_url,
      event_stock
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Event ID fehlt.' });
    }

    try {
      const query = `
        UPDATE events
        SET title       = COALESCE($1, title),
            description = COALESCE($2, description),
            location    = COALESCE($3, location),
            category    = COALESCE($4, category),
            event_date  = COALESCE($5, event_date),
            price       = COALESCE($6, price),
            logo_url    = $7,
            event_stock = COALESCE($8, event_stock)
        WHERE event_id  = $9
        RETURNING *;
      `;

      const values = [
        title !== undefined ? title : null,
        description !== undefined ? description : null,
        location !== undefined ? location : null,
        category !== undefined ? category : null,
        event_date !== undefined ? event_date : null,
        price !== undefined ? parseFloat(price) : null,
        logo_url !== undefined ? (logo_url || null) : null,
        event_stock !== undefined ? parseInt(event_stock, 10) : null,
        id
      ];

      // Hier wird 'result' sauber deklariert und zugewiesen:
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Event mit ID ${id} nicht gefunden.` });
      }

      return res.status(200).json({
        message: 'Event erfolgreich aktualisiert.',
        event: result.rows[0]
      });
    } catch (err) {
      console.error('Fehler bei UpdateEventHandler:', err);
      return res.status(500).json({ error: 'Serverfehler beim Aktualisieren des Events: ' + err.message });
    }
  }
}

module.exports = UpdateEventHandler;