const db = require('../config/db');
const { captureOrder } = require('../config/paypal');
const crypto = require('crypto');
const QRCode = require('qrcode');
const transporter = require('../config/mailer');

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

      // 1. E-Mail-Adresse des eingeloggten Users aus der Datenbank holen
      const userResult = await db.query('SELECT email FROM users WHERE user_id = $1', [userId]);
      const userEmail = userResult.rows[0]?.email;

      // 2. Warenkorb abfragen (mit e.title statt e.name)
      const cartResult = await db.query(
        `SELECT ci.event_id, ci.quantity, e.price, e.title 
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

      // 3. QR-Code generieren und Bestätigungs-E-Mail senden
      try {
        if (userEmail) {
          const qrBuffer = await QRCode.toBuffer(`TIXIFY-ORDER-${orderId}`);
          const eventNames = cartResult.rows.map(item => item.title).join(', ');

          const mailOptions = {
            from: `"Tixify" <${process.env.SENDER_EMAIL}>`,
            to: userEmail,
            subject: `Bestätigung für deine Bestellung #${orderId}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #4A3AFF;">Buchung erfolgreich!</h2>
                <p>Vielen Dank für deinen Einkauf bei Tixify. Deine Tickets wurden ausgestellt.</p>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Bestellnummer:</strong> #${orderId}</p>
                  <p style="margin: 5px 0;"><strong>Event(s):</strong> ${eventNames}</p>
                  <p style="margin: 5px 0;"><strong>Gesamtbetrag:</strong> ${totalAmount} €</p>
                </div>
                <p><strong>Dein QR-Code für den Einlass:</strong></p>
                <div style="text-align: center; margin: 20px 0;">
                  <img src="cid:qrcode_image" alt="QR-Code Ticket" style="width: 200px; height: 200px;" />
                </div>
              </div>
            `,
            attachments: [
              {
                filename: `ticket-${orderId}.png`,
                content: qrBuffer,
                cid: 'qrcode_image'
              }
            ]
          };

          await transporter.sendMail(mailOptions);
          console.log(`E-Mail erfolgreich an ${userEmail} gesendet!`);
        }
      } catch (emailError) {
        console.error('Fehler beim Senden der E-Mail:', emailError);
      }

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