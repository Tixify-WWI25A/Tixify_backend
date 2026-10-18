const users = require('../repositories/userRepository');
const { parseUserId } = require('../validation/userValidation');
const { HttpError } = require('../middleware/errorHandler');

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
