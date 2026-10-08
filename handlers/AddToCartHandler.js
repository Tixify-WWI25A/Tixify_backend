const pool = require('../config/db');

class AddToCartHandler {
    async execute(req, res) {
        const userId = req.user.userId;
        const { eventId, quantity = 1 } = req.body;

        if (!eventId) {
            return res.status(400).json({ error: 'Event ID erforderlich.' });
        }

        try {
          // 1. Verfügbaren Lagerbestand prüfen
          const eventRes = await pool.query('SELECT event_stock FROM events WHERE event_id = $1', [eventId]);
            if (eventRes.rows.length === 0) {
                return res.status(404).json({ error: 'Event existiert nicht.' });
            }
            if (eventRes.rows[0].event_stock < quantity) {
                return res.status(400).json({ error: 'Nicht genügend Tickets verfügbar.' });
            } 

          // 2. Cart-ID des Nutzers abfragen (oder anlegen falls nicht existent)
          let cartRes = await pool.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
          let cartId;
          if (cartRes.rows.length === 0) {
            const newCart = await pool.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING cart_id', [userId]);
            cartId = newCart.rows[0].cart_id;
          } else {
            cartId = cartRes.rows[0].cart_id;
          } 

          // 3. Prüfen, ob Item bereits im Warenkorb liegt
          const itemRes = await pool.query(
            'SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = $1 AND event_id = $2',
            [cartId, eventId]
          );

          if (itemRes.rows.length > 0) {
            await pool.query(
              'UPDATE cart_items SET quantity = quantity + $1 WHERE cart_item_id = $2',
              [quantity, itemRes.rows[0].cart_item_id]
            );
            } else {
              await pool.query(
                'INSERT INTO cart_items (cart_id, event_id, quantity) VALUES ($1, $2, $3)',
                [cartId, eventId, quantity]
              );
            }
            
            return res.status(200).json({ message: 'Artikel zum Warenkorb hinzugefügt.' });
        } catch (err) {
            console.error('Fehler bei AddToCartHandler:', err);
            return res.status(500).json({ error: 'Konnte nicht zum Warenkorb hinzugefügt werden.' });
        }
    }
}

module.exports = AddToCartHandler;