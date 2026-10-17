const express = require('express');
const router = express.Router();

const checkLogin = require('../config/auth');
const requireAdmin = require('../config/requireAdmin');

const routes = [
  ['get', '/', 'GetUsersHandler', [checkLogin]],
  ['patch', '/:id/role', 'UpdateUserRoleHandler', [checkLogin, requireAdmin]],
  ['delete', '/:id', 'DeleteUserHandler', [checkLogin, requireAdmin]],
];

routes.forEach(([method, path, handlerName, middlewares = []]) => {
  const imported = require(`../handlers/${handlerName}`);
  console.log(`Prüfe ${handlerName}:`, typeof imported, imported);
  const HandlerClass = imported;
  const handlerInstance = new HandlerClass();

  router[method](path, ...middlewares, (req, res) => handlerInstance.execute(req, res));
});

module.exports = router;