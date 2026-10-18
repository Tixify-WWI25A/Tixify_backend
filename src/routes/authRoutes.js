const express = require('express');

function authRoutes({ loginLimiter }) {
  const routes = [
    ['post', '/register', 'RegisterHandler'],
    ['post', '/login', 'LoginHandler', [loginLimiter]]
  ];

  const router = express.Router();

  routes.forEach(([method, path, handlerName, middlewares = []]) => {
    const HandlerClass = require(`../handlers/${handlerName}`);
    const handlerInstance = new HandlerClass();
    router[method](path, ...middlewares, (req, res) => handlerInstance.execute(req, res));
  });

  return router;
}

module.exports = { authRoutes };