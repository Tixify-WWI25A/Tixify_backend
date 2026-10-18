// Basiert auf unserem handlers/LoginHandler.js, der Timing-Schutz wurde mithilfe von KI vorgeschlagen und ergänzt.
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const users = require('../repositories/userRepository');
const { normalizeEmail } = require('../validation/userValidation');
const { HttpError } = require('../middleware/errorHandler');

// Für unbekannte E-Mails trotzdem einmal bcrypt rechnen: Sonst verrät die schnellere Antwort,
// welche Adressen registriert sind.
const DUMMY_HASH = bcrypt.hashSync('timing-schutz', 10);

class LoginHandler {
  async execute(req, res) {
    const { password } = req.body || {};
    if (typeof password !== 'string' || !req.body?.email) throw new HttpError(400, 'E-Mail und Passwort erforderlich.');

    let email;
    try { email = normalizeEmail(req.body.email); } catch { throw new HttpError(401, 'Ungültige Anmeldedaten.'); }

    const user = await users.findForLogin(email);
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

    if (!user || !ok) throw new HttpError(401, 'Ungültige Anmeldedaten.');

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
    const { passwordHash, ...publicUser } = user;
    res.json({ message: 'Login erfolgreich.', token, user: publicUser });
  }
}

module.exports = LoginHandler;
