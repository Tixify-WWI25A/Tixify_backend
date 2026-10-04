const db = require('../config/db');
const { createOrder } = require('../config/paypal');

class CreatePaypalOrderHandler {
  async execute(req, res) {
    const userId = req.user.userId;

    try {
      const cartResult = await db.query(
        `SELECT ci.quantity, e.price 
         FROM cart_items ci
         JOIN carts c ON ci.cart_id = c.cart_id
         JOIN events e ON ci.event_id = e.event_id
         WHERE c.user_id = $1`,
        [userId]
      );

      if (cartResult.rows.length === 0) {
        return res.status(400).json({ error: 'Der Warenkorb ist leer' });
      }

      const totalAmount = cartResult.rows.reduce(
        (sum, item) => sum + parseFloat(item.price) * item.quantity, 0
      ).toFixed(2);

      const paypalOrder = await createOrder(totalAmount);

      return res.status(201).json({
        paypalOrderId: paypalOrder.id,
        totalAmount
      });

    } catch (error) {
      console.error('Fehler beim Erstellen der PayPal Order:', error);
      return res.status(500).json({ error: 'PayPal-Order konnte nicht erstellt werden' });
    }
  }
}

module.exports = CreatePaypalOrderHandler;