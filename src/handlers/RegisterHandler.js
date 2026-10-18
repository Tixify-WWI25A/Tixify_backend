const bcrypt = require('bcrypt');
const users = require('../repositories/userRepository');
const { validateRegistration } = require('../validation/userValidation');
const { publishEvent } = require('../services/notificationQueue');

const BCRYPT_ROUNDS = 10;

class RegisterHandler {
  async execute(req, res) {
    const { username, email, password } = validateRegistration(req.body);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await users.createUser({ username, email, passwordHash });

    try {
      await publishEvent('user.registered', { userId: user.id, email: user.email, username: user.name }, `user-registered-${user.id}`);
    } catch (err) {
      console.error('[gateway] user.registered nicht veröffentlicht:', err.message);
    }

    res.status(201).json({ message: 'Registrierung erfolgreich!', user });
  }
}

module.exports = RegisterHandler;
