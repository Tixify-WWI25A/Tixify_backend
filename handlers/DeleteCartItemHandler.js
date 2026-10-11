const db = require('../config/db');

class DeleteCartItemHandler {
  async execute(req, res) {
    const userId = req.user.userId;
    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ error: 'Event-ID fehlt' });
    }

    try {
      const result = await db.query(
        `DELETE FROM cart_items 
         WHERE event_id = $1 
           AND cart_id = (SELECT cart_id FROM carts WHERE user_id = $2)
         RETURNING cart_item_id`,
        [eventId, userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Artikel nicht im Warenkorb gefunden' });
      }

      return res.status(200).json({
        message: 'Artikel erfolgreich aus dem Warenkorb entfernt'
      });
    } catch (error) {
      console.error('Fehler beim Löschen des Cart-Items:', error);
      return res.status(500).json({ error: 'Fehler beim Entfernen des Artikels' });
    }
  }
}

module.exports = DeleteCartItemHandler;