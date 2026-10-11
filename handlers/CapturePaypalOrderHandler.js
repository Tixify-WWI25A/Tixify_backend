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
      // 1. PayPal-Zahlung einziehen
      const captureData = await captureOrder(paypalOrderId);

      if (captureData.status !== 'COMPLETED') {
        return res.status(400).json({ error: 'Zahlung konnte nicht abgeschlossen werden' });
      }

      // 2. Client für Transaktion aus dem Pool holen
      const client = await db.connect();

      let orderId;
      let totalAmount;
      let cartItems = [];
      let userEmail = null;

      try {
        await client.query('BEGIN');

        // E-Mail abrufen
        const userResult = await client.query('SELECT email FROM users WHERE user_id = $1', [userId]);
        userEmail = userResult.rows[0]?.email;

        // Warenkorb abrufen
        const cartResult = await client.query(
          `SELECT ci.event_id, ci.quantity, e.price, e.title 
           FROM cart_items ci
           JOIN carts c ON ci.cart_id = c.cart_id
           JOIN events e ON ci.event_id = e.event_id
           WHERE c.user_id = $1`,
          [userId]
        );

        if (cartResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Keine Artikel im Warenkorb' });
        }

        cartItems = cartResult.rows;
        totalAmount = cartItems.reduce(
          (sum, item) => sum + parseFloat(item.price) * item.quantity, 0
        ).toFixed(2);

        // Bestellung erstellen
        const orderResult = await client.query(
          `INSERT INTO orders (user_id, total_amount, status, paypal_order_id)
           VALUES ($1, $2, $3, $4)
           RETURNING order_id`,
          [userId, totalAmount, 'completed', paypalOrderId]
        );
        orderId = orderResult.rows[0].order_id;

        // Tickets erstellen & Bestand paketweise anpassen
        for (const item of cartItems) {
          for (let i = 0; i < item.quantity; i++) {
            const ticketCode = 'TIX-' + crypto.randomBytes(4).toString('hex').toUpperCase();

            await client.query(
              `INSERT INTO tickets (order_id, event_id, ticket_code, price)
               VALUES ($1, $2, $3, $4)`,
              [orderId, item.event_id, ticketCode, item.price]
            );
          }

          // Bestand in einer einzigen Abfrage um die Gesamtanzahl verringern
          await client.query(
            `UPDATE events 
             SET event_stock = GREATEST(0, event_stock - $1) 
             WHERE event_id = $2`,
            [item.quantity, item.event_id]
          );
        }

        // Warenkorb leeren
        await client.query(
          `DELETE FROM cart_items 
           WHERE cart_id = (SELECT cart_id FROM carts WHERE user_id = $1)`,
          [userId]
        );

        await client.query('COMMIT');
      } catch (dbError) {
        await client.query('ROLLBACK');
        throw dbError;
      } finally {
        client.release();
      }

      // 3. E-Mail asynchron senden (blockiert den Response bei Netzwerk-Latenzen nicht)
      (async () => {
        try {
          if (userEmail) {
            const qrBuffer = await QRCode.toBuffer(`TIXIFY-ORDER-${orderId}`);
            const eventNames = cartItems.map(item => item.title).join(', ');

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
          }
        } catch (emailError) {
          console.error('Fehler beim E-Mail-Versand:', emailError);
        }
      })();

      return res.status(200).json({
        message: 'Kauf erfolgreich abgeschlossen!',
        orderId
      });

    } catch (error) {
      console.error('Fehler bei CapturePaypalOrderHandler:', error);
      return res.status(500).json({ error: 'Fehler beim Verarbeiten der Zahlung: ' + error.message });
    }
  }
}

module.exports = CapturePaypalOrderHandler;