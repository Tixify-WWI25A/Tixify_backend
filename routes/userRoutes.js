const express = require('express');
const router = express.Router();
const checkLogin = require('../config/auth');

const routes = [
  ['get',    '/',          'GetUsersHandler',       [checkLogin]],
  ['patch',  '/:id/role',  'UpdateUserRoleHandler', [checkLogin]],
  ['delete', '/:id',       'DeleteUserHandler',     [checkLogin]],
];

routes.forEach(([method, path, handlerName, middlewares = []]) => {
  const imported = require(`../handlers/${handlerName}`);
  console.log(`Prüfe ${handlerName}:`, typeof imported, imported);
  const HandlerClass = imported;
  const handlerInstance = new HandlerClass();

  router[method](path, ...middlewares, (req, res) => handlerInstance.execute(req, res));
});

module.exports = router;