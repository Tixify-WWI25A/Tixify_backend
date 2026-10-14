const pool = require('../config/db');

class UpdateEventHandler {
  async execute(req, res) {
    const { id } = req.params;
    const {
      title,
      description,
      location,
      address,
      latitude,
      longitude,
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
            address     = COALESCE($4, address),
            latitude    = COALESCE($5, latitude),
            longitude   = COALESCE($6, longitude),
            category    = COALESCE($7, category),
            event_date  = COALESCE($8, event_date),
            price       = COALESCE($9, price),
            logo_url    = $10,
            event_stock = COALESCE($11, event_stock)
        WHERE event_id  = $12
        RETURNING *;
      `;

      const values = [
        title !== undefined ? title : null,
        description !== undefined ? description : null,
        location !== undefined ? location : null,
        address !== undefined ? address : null,
        latitude !== undefined ? (latitude !== null && latitude !== '' ? parseFloat(latitude) : null) : null,
        longitude !== undefined ? (longitude !== null && longitude !== '' ? parseFloat(longitude) : null) : null,
        category !== undefined ? category : null,
        event_date !== undefined ? event_date : null,
        price !== undefined ? parseFloat(price) : null,
        logo_url !== undefined ? (logo_url || null) : null,
        event_stock !== undefined ? parseInt(event_stock, 10) : null,
        id
      ];

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