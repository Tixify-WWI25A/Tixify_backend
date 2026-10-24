// Basiert auf unserem handlers/UpdateUserRoleHandler.js (Rolle eines Nutzers ändern).
// Mit KI überarbeitet (KI-Log Nr. 8): SQL ins Repository, Prüfung der erlaubten Rollen, Schutz davor, sich selbst die Admin-Rechte zu entziehen.
const users = require('../repositories/userRepository');
const { ROLES, parseUserId } = require('../validation/userValidation');
const { HttpError } = require('../middleware/errorHandler');

/** PATCH /api/users/:id/role  { role } (nur Admin) */
class UpdateUserRoleHandler {
  async execute(req, res) {
    const id = parseUserId(req.params.id);
    const role = req.body?.role;
    if (!ROLES.includes(role)) throw new HttpError(400, `role muss eine von ${ROLES.join(', ')} sein.`);
    // Schutz vor Aussperren: niemand nimmt sich selbst die Admin-Rechte
    if (id === req.user.userId && role !== 'admin') {
      throw new HttpError(409, 'Du kannst dir die Administratorrechte nicht selbst entziehen.');
    }
    const user = await users.setRole(id, role);
    if (!user) throw new HttpError(404, 'Nutzer nicht gefunden.');
    res.json(user);
  }
}

module.exports = UpdateUserRoleHandler;
