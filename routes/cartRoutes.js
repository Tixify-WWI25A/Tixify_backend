const express = require('express');
const router = express.Router();
const authenticateToken = require('../config/auth');

const routes = [
  ['get',  '/',      'GetCartHandler',   [authenticateToken]],
  ['post', '/items', 'AddToCartHandler', [authenticateToken]],
  ['delete', '/items/:eventId', 'DeleteCartItemHandler', [authenticateToken]],
];

routes.forEach(([method, path, handlerName, middlewares = []]) => {
  const imported = require(`../handlers/${handlerName}`);
  console.log(`Prüfe ${handlerName}:`, typeof imported, imported);
  const HandlerClass = imported;
  const handlerInstance = new HandlerClass();

  router[method](path, ...middlewares, (req, res) => handlerInstance.execute(req, res));
});

module.exports = router;