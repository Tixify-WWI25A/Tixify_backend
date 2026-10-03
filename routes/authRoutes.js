const express = require('express');
const router = express.Router();

const routes = [
  ['post', '/register', 'RegisterHandler'],
  ['post', '/login',    'LoginHandler'],
];

routes.forEach(([method, path, handlerName, middlewares = []]) => {
  const imported = require(`../handlers/${handlerName}`);
  console.log(`Prüfe ${handlerName}:`, typeof imported, imported);
  const HandlerClass = imported;
  const handlerInstance = new HandlerClass();

  router[method](path, ...middlewares, (req, res) => handlerInstance.execute(req, res));
});

module.exports = router;