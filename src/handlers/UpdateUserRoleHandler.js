const users = require('../repositories/userRepository');
const { ROLES, parseUserId } = require('../validation/userValidation');
const { HttpError } = require('../middleware/errorHandler');

class UpdateUserRoleHandler {
  async execute(req, res) {
    const id = parseUserId(req.params.id);
    const role = req.body?.role;
    if (!ROLES.includes(role)) throw new HttpError(400, `role muss eine von ${ROLES.join(', ')} sein.`);
    if (id === req.user.userId && role !== 'admin') {
      throw new HttpError(409, 'Du kannst dir die Administratorrechte nicht selbst entziehen.');
    }
    const user = await users.setRole(id, role);
    if (!user) throw new HttpError(404, 'Nutzer nicht gefunden.');
    res.json(user);
  }
}

module.exports = UpdateUserRoleHandler;
