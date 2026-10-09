const pool = require('../config/db');

class GetCartHandler {
  async execute(req, res) {
    const userId = req.user.userId;

    try {
      const result = await pool.query(
        `SELECT ci.cart_item_id, ci.event_id, ci.quantity, e.title, e.price, e.event_stock, e.location, e.event_date
         FROM cart_items ci
         JOIN carts c ON ci.cart_id = c.cart_id
         JOIN events e ON ci.event_id = e.event_id
         WHERE c.user_id = $1`,
        [userId]
      );

      const items = result.rows;
      const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0).toFixed(2);

      return res.status(200).json({
        items,
        totalAmount
      });
    } catch (err) {
      console.error('Fehler bei GetCartHandler:', err);
      return res.status(500).json({ error: 'Warenkorb konnte nicht geladen werden.' });
    }
  }
}

module.exports = GetCartHandler;