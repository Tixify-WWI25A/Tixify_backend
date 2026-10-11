const db = require('../config/db');

class AddToCartHandler {
  async execute(req, res) {
    const userId = req.user.userId;
    const { eventId, quantity, delta } = req.body;

    if (!eventId || (!quantity && delta === undefined)) {
      return res.status(400).json({ error: 'Ungültige Eingabedaten' });
    }

    try {
      let cartResult = await db.query('SELECT cart_id FROM carts WHERE user_id = $1', [userId]);
      let cartId;

      if (cartResult.rows.length === 0) {
        const newCart = await db.query(
          'INSERT INTO carts (user_id) VALUES ($1) RETURNING cart_id',
          [userId]
        );
        cartId = newCart.rows[0].cart_id;
      } else {
        cartId = cartResult.rows[0].cart_id;
      }

      const itemCheck = await db.query(
        'SELECT quantity FROM cart_items WHERE cart_id = $1 AND event_id = $2',
        [cartId, eventId]
      );

      if (itemCheck.rows.length > 0) {
        let targetQuantity;
        if (delta !== undefined) {
          targetQuantity = itemCheck.rows[0].quantity + delta;
        } else {
          targetQuantity = quantity;
        }

        if (targetQuantity <= 0) {
          await db.query(
            'DELETE FROM cart_items WHERE cart_id = $1 AND event_id = $2',
            [cartId, eventId]
          );
        } else {
          await db.query(
            'UPDATE cart_items SET quantity = $1 WHERE cart_id = $2 AND event_id = $3',
            [targetQuantity, cartId, eventId]
          );
        }
      } else {
        await db.query(
          'INSERT INTO cart_items (cart_id, event_id, quantity) VALUES ($1, $2, $3)',
          [cartId, eventId, quantity || 1]
        );
      }

      return res.status(200).json({ message: 'Warenkorb aktualisiert' });
    } catch (err) {
      console.error('Fehler in AddToCartHandler:', err);
      return res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
}

module.exports = AddToCartHandler;