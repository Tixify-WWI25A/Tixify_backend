const users = require('../repositories/userRepository');
const { HttpError } = require('../middleware/errorHandler');

class GetMeHandler {
  async execute(req, res) {
    const user = await users.getUser(req.user.userId);
    if (!user) throw new HttpError(404, 'Nutzer existiert nicht mehr.');
    res.json(user);
  }
}

module.exports = GetMeHandler;
