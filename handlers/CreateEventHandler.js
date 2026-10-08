const pool = require('../config/db');

class CreateEventHandler {
    async execute(req, res) {
        const { title, description, location, event_date, price, logo_url, event_stock } = req.body;

        // Validierung der Pflichtfelder
        if (!title || !location || !event_date || price === undefined || event_stock === undefined) {
            return res.status(400).json({
            error: 'Pflichtfelder fehlen: title, location, event_date, price und event_stock sind erforderlich.'
            });
        }

        try {
            const query = `
              INSERT INTO events (title, description, location, event_date, price, logo_url, event_stock)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING *;
            `;
           
            const values = [
              title,
              description || '',
              location,
              event_date,
              parseFloat(price),
              logo_url || '',
              parseInt(event_stock, 10)
            ];

            const result = await pool.query(query, values);

            return res.status(201).json({
              message: 'Event erfolgreich angelegt.',
              event: result.rows[0]
            });
        } catch (err) {
            console.error('Fehler in CreateEventHandler:', err);
            return res.status(500).json({ error: 'Serverfehler beim Anlegen des Events.' });
        }
    }
}

module.exports = CreateEventHandler;