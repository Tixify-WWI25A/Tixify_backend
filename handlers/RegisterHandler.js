const pool = require('../config/db');
const bcrypt = require('bcrypt');
const transporter = require('../config/mailer');

class RegisterHandler {
  async execute(req, res) {
    try {
      const username = req.body.username || req.body.name;
      const { email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Bitte alle Felder ausfüllen' });
      }

      // 1. Prüfen, ob User existiert
      const userCheck = await pool.query(
        'SELECT 1 FROM users WHERE email = $1',
        [email]
      );

      if (userCheck.rows.length > 0) {
        return res.status(400).json({ error: 'E-Mail ist bereits vergeben.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO users (username, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING user_id, username, email, role`,
        [username, email, hashedPassword, 'customer']
      );

      // 2. Willkommens-E-Mail senden
      try {
        const mailOptions = {
          from: `"Tixify" <${process.env.SENDER_EMAIL}>`,
          to: email,
          subject: 'Willkommen bei Tixify! 🎟️',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px;">
              <h2 style="color: #4A3AFF;">Willkommen bei Tixify, ${username}!</h2>
              <p>Dein Account wurde erfolgreich erstellt.</p>
              <p>Du kannst dich ab sofort einloggen, Events durchstöbern und deine Tickets buchen.</p>
              <br/>
              <p>Viel Spaß wünscht dir dein Tixify-Team!</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Willkommens-E-Mail erfolgreich an ${email} gesendet!`);
      } catch (emailError) {
        console.error('Fehler beim Senden der Willkommens-E-Mail:', emailError);
        // Registrierung läuft trotzdem erfolgreich durch, falls die E-Mail mal klemmt
      }

      return res.status(201).json({
        message: 'Registrierung erfolgreich!',
        user: result.rows[0]
      });

    } catch (err) {
      console.error('Fehler bei RegisterHandler:', err);
      return res.status(500).json({ error: 'Serverfehler bei der Registrierung' });
    }
  }
}

module.exports = RegisterHandler;