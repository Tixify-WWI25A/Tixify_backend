const db = require('../config/db');

class UpdateEventHandler {
  async execute(req, res) {
    const { id } = req.params;
    const {
      title,
      category,
      location,
      event_date,
      price,
      event_stock,
      description
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Event ID fehlt' });
    }

    try {
      const result = await db.query(
        `UPDATE events 
         SET title        = COALESCE($1, title),
             category     = COALESCE($2, category),
             location     = COALESCE($3, location),
             event_date   = COALESCE($4, event_date),
             price        = COALESCE($5, price),
             event_stock  = COALESCE($6, event_stock),
             description  = COALESCE($7, description)
         WHERE event_id   = $8
         RETURNING *`,
        [title, category, location, event_date, price, event_stock, description, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Event mit ID ${id} nicht gefunden` });
      }

      return res.status(200).json({
        message: 'Event erfolgreich aktualisiert',
        event: result.rows[0]
      });
    } catch (error) {
      console.error('Fehler bei UpdateEventHandler:', error);
      return res.status(500).json({ error: 'Fehler beim Aktualisieren des Events: ' + error.message });
    }
  }
}

module.exports = UpdateEventHandler;