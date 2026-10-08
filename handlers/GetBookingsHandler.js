const pool = require('../config/db');

class GetBookingsHandler {
  async execute(req, res) {
    const userId = req.user.userId;

    try {
      const ordersRes = await pool.query(
        `SELECT order_id, total_amount, status, created_at
         FROM orders
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      const orders = [];
      for (const order of ordersRes.rows) {
        const ticketsRes = await pool.query(
          `SELECT t.ticket_id, t.ticket_code, t.price, e.title, e.location, e.event_date
           FROM tickets t
           JOIN events e ON t.event_id = e.event_id
           WHERE t.order_id = $1`,
          [order.order_id]
        );

        orders.push({
          ...order,
          tickets: ticketsRes.rows
        });
      }

      return res.status(200).json(orders);
    } catch (err) {
      console.error('Fehler bei GetBookingsHandler:', err);
      return res.status(500).json({ error: 'Buchungen konnten nicht geladen werden.' });
    }
  }
}

module.exports = GetBookingsHandler;