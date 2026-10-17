const express = require('express');
const router = express.Router();

const checkLogin = require('../config/auth');
const requireAdmin = require('../config/requireAdmin');

const routes = [
  ['get', '/', 'GetEventsHandler'],
  ['get', '/:id', 'GetEventByIdHandler'],
  ['post', '/', 'CreateEventHandler', [checkLogin, requireAdmin]],
  ['delete', '/:id', 'DeleteEventHandler', [checkLogin, requireAdmin]],
  ['patch', '/:id', 'UpdateEventHandler', [checkLogin, requireAdmin]]
];

routes.forEach(([method, path, handlerName]) => {
  const imported = require(`../handlers/${handlerName}`);
  console.log(`Prüfe ${handlerName}:`, typeof imported, imported);
  const HandlerClass = imported;
  const handlerInstance = new HandlerClass();

  router[method](path, (req, res) => handlerInstance.execute(req, res));
});

module.exports = router;