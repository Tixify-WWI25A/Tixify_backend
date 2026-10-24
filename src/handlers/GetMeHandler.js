// Mit KI erstellt nach unserem Handler-Muster (KI-Log Nr. 8): eigene Nutzerdaten abrufen.
const users = require('../repositories/userRepository');
const { HttpError } = require('../middleware/errorHandler');

/** GET /api/users/me – aktuelle Daten des angemeldeten Nutzers (z. B. nach einer Rollenänderung) */
class GetMeHandler {
  async execute(req, res) {
    const user = await users.getUser(req.user.userId);
    if (!user) throw new HttpError(404, 'Nutzer existiert nicht mehr.');
    res.json(user);
  }
}

module.exports = GetMeHandler;
