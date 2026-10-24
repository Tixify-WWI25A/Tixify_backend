// Basiert auf unserem handlers/LoginHandler.js (Ablauf: Eingaben prüfen, bcrypt-Vergleich, JWT mit userId, email, role).
// Mit KI überarbeitet (KI-Log Nr. 8): SQL ins Repository, Fehler über HttpError, gleiche Laufzeit bei unbekannter E-Mail (Timing-Schutz), Ablaufzeit des Tokens konfigurierbar.
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const users = require('../repositories/userRepository');
const { normalizeEmail } = require('../validation/userValidation');
const { HttpError } = require('../middleware/errorHandler');

// Für unbekannte E-Mails trotzdem einmal bcrypt rechnen: Sonst verrät die schnellere Antwort,
// welche Adressen registriert sind.
const DUMMY_HASH = bcrypt.hashSync('timing-schutz', 10);

/** POST /api/auth/login  { email, password } → { token, user } */
class LoginHandler {
  async execute(req, res) {
    const { password } = req.body || {};
    if (typeof password !== 'string' || !req.body?.email) throw new HttpError(400, 'E-Mail und Passwort erforderlich.');

    let email;
    try { email = normalizeEmail(req.body.email); } catch { throw new HttpError(401, 'Ungültige Anmeldedaten.'); }

    const user = await users.findForLogin(email);
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    // Gleiche Meldung für „E-Mail unbekannt“ und „Passwort falsch“
    if (!user || !ok) throw new HttpError(401, 'Ungültige Anmeldedaten.');

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
    const { passwordHash, ...publicUser } = user; // eslint-disable-line no-unused-vars
    res.json({ message: 'Login erfolgreich.', token, user: publicUser });
  }
}

module.exports = LoginHandler;
