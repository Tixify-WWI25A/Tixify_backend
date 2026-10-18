const express = require('express');
const { admin, loggedIn } = require('../middleware/auth');

const routes = [
  ['get', '/me', 'GetMeHandler', loggedIn],
  ['get', '/', 'GetUsersHandler', admin],
  ['patch', '/:id/role', 'UpdateUserRoleHandler', admin],
  ['delete', '/:id', 'DeleteUserHandler', admin]
];

const router = express.Router();

routes.forEach(([method, path, handlerName, middlewares = []]) => {
  const HandlerClass = require(`../handlers/${handlerName}`);
  const handlerInstance = new HandlerClass();
  router[method](path, ...middlewares, (req, res) => handlerInstance.execute(req, res));
});

module.exports = { routes, router };