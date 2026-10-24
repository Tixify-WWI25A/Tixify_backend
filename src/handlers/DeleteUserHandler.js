// Basiert auf unserem handlers/DeleteUserHandler.js (Nutzer löschen).
// Mit KI überarbeitet (KI-Log Nr. 8): SQL ins Repository, eigenes Konto nicht löschbar, 404 bei unbekanntem Nutzer.
const users = require('../repositories/userRepository');
const { parseUserId } = require('../validation/userValidation');
const { HttpError } = require('../middleware/errorHandler');

/** DELETE /api/users/:id (nur Admin, nicht sich selbst) */
class DeleteUserHandler {
  async execute(req, res) {
    const id = parseUserId(req.params.id);
    if (id === req.user.userId) throw new HttpError(409, 'Du kannst dein eigenes Konto hier nicht löschen.');
    const deleted = await users.deleteUser(id);
    if (!deleted) throw new HttpError(404, 'Nutzer nicht gefunden.');
    res.status(204).end();
  }
}

module.exports = DeleteUserHandler;
