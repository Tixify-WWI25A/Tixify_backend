const db = require('../config/db');
const { captureOrder } = require('../config/paypal');
const crypto = require('crypto');

class CapturePaypalOrderHandler {
  async execute(req, res) {
    const userId = req.user.userId;
    const { paypalOrderId } = req.body;

    if (!paypalOrderId) {
      return res.status(400).json({ error: 'PayPal Order ID fehlt' });
    }

    try {
      const captureData = await captureOrder(paypalOrderId);

      if (captureData.status !== 'COMPLETED') {
        return res.status(400).json({ error: 'Zahlung konnte nicht abgeschlossen werden' });
      }

      const cartResult = await db.query(
        `SELECT ci.event_id, ci.quantity, e.price 
         FROM cart_items ci
         JOIN carts c ON ci.cart_id = c.cart_id
         JOIN events e ON ci.event_id = e.event_id
         WHERE c.user_id = $1`,
        [userId]
      );

      if (cartResult.rows.length === 0) {
        return res.status(400).json({ error: 'Keine Artikel im Warenkorb' });
      }

      const totalAmount = cartResult.rows.reduce(
        (sum, item) => sum + parseFloat(item.price) * item.quantity, 0
      ).toFixed(2);

      const orderResult = await db.query(
        `INSERT INTO orders (user_id, total_amount, status, paypal_order_id)
         VALUES ($1, $2, $3, $4)
         RETURNING order_id`,
        [userId, totalAmount, 'completed', paypalOrderId]
      );
      const orderId = orderResult.rows[0].order_id;

      for (const item of cartResult.rows) {
        for (let i = 0; i < item.quantity; i++) {
          const ticketCode = 'TIX-' + crypto.randomBytes(4).toString('hex').toUpperCase();

          await db.query(
            `INSERT INTO tickets (order_id, event_id, ticket_code, price)
             VALUES ($1, $2, $3, $4)`,
            [orderId, item.event_id, ticketCode, item.price]
          );

          await db.query(
            `UPDATE events SET event_stock = event_stock - 1 WHERE event_id = $1`,
            [item.event_id]
          );
        }
      }

      await db.query(
        `DELETE FROM cart_items WHERE cart_id = (SELECT cart_id FROM carts WHERE user_id = $1)`,
        [userId]
      );

      return res.status(200).json({
        message: 'Kauf erfolgreich abgeschlossen!',
        orderId
      });

    } catch (error) {
      console.error('Fehler bei CapturePaypalOrderHandler:', error);
      return res.status(500).json({ error: 'Fehler beim Verarbeiten der Zahlung' });
    }
  }
}

module.exports = CapturePaypalOrderHandler;