// Basiert auf unserem handlers/RegisterHandler.js (Ablauf: Passwort mit bcrypt hashen, Nutzer anlegen, Willkommensmail).
// Mit KI überarbeitet (KI-Log Nr. 8): Validierung (Passwort ab 8 Zeichen, E-Mail kleingeschrieben – F-08), 409 bei doppelter E-Mail auch bei gleichzeitigen Anfragen, Willkommensmail asynchron über die Queue statt direkt.
const bcrypt = require('bcrypt');
const users = require('../repositories/userRepository');
const { validateRegistration } = require('../validation/userValidation');
const { publishEvent } = require('../services/eventBus');

const BCRYPT_ROUNDS = 10;

/** POST /api/auth/register  { username (oder name), email, password } */
class RegisterHandler {
  async execute(req, res) {
    const { username, email, password } = validateRegistration(req.body);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await users.createUser({ username, email, passwordHash }); // 409, falls E-Mail vergeben

    // Willkommensmail asynchron über die Queue (früher: Handler wartete auf den Mailversand).
    // Scheitert das Veröffentlichen, ist die Registrierung trotzdem gültig.
    try {
      await publishEvent('user.registered', { userId: user.id, email: user.email, username: user.name }, `user-registered-${user.id}`);
    } catch (err) {
      console.error('[gateway] user.registered nicht veröffentlicht:', err.message);
    }

    res.status(201).json({ message: 'Registrierung erfolgreich!', user });
  }
}

module.exports = RegisterHandler;
