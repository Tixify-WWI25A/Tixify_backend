// Basiert auf unserem handlers/GetUsersHandler.js (Nutzerliste für Admins).
// Mit KI überarbeitet (KI-Log Nr. 8): SQL ins Repository.
const users = require('../repositories/userRepository');

/** GET /api/users (nur Admin) */
class GetUsersHandler {
  async execute(_req, res) {
    res.json(await users.listUsers());
  }
}

module.exports = GetUsersHandler;
