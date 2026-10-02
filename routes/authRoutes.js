const express = require('express');
const router = express.Router();

const routes = [
  ['post', '/register', 'RegisterHandler'],
  ['post', '/login',    'LoginHandler']
];

routes.forEach(([method, path, handlerName]) => {
  const HandlerClass = require(`../handlers/${handlerName}`);
  const handlerInstance = new HandlerClass();

  router[method](path, (req, res) => handlerInstance.execute(req, res));
});

module.exports = router;