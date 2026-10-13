const pool = require('../config/db');

class CreateEventHandler {
    async execute(req, res) {
        const {title, description, location, category, event_date, price, logo_url, event_stock, address, latitude, longitude 
        } = req.body;

        // Validierung der Pflichtfelder
        if (!title || !location || !event_date || price === undefined || event_stock === undefined) {
            return res.status(400).json({
                error: 'Pflichtfelder fehlen: title, location, event_date, price und event_stock sind erforderlich.'
            });
        }

        try {
            const query = `
              INSERT INTO events (title, description, location, category, event_date, price, logo_url, event_stock, address, latitude, longitude)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              RETURNING *;
            `;
            
            const values = [
              title,
              description || '',
              location,
              category || 'Konzerte',
              event_date,
              parseFloat(price),
              logo_url || null,
              parseInt(event_stock, 10),
              address || location, // Fallback auf location, falls keine separate Adresse geschickt wird
              latitude ? parseFloat(latitude) : null,
              longitude ? parseFloat(longitude) : null
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