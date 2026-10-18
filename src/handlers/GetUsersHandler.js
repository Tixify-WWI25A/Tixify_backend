const users = require('../repositories/userRepository');

class GetUsersHandler {
  async execute(_req, res) {
    res.json(await users.listUsers());
  }
}

module.exports = GetUsersHandler;
