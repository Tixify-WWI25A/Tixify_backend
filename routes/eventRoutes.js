const express = require('express');
const router = express.Router();

const routes = [
  ['get',  '/',    'GetEventsHandler'],
  ['get',  '/:id', 'GetEventByIdHandler'],
  ['post', '/',    'CreateEventHandler'],
  ['delete', '/:id', 'DeleteEventHandler'],
];

routes.forEach(([method, path, handlerName]) => {
  const HandlerClass = require(`../handlers/${handlerName}`);
  const handlerInstance = new HandlerClass();

  router[method](path, (req, res) => handlerInstance.execute(req, res));
});

module.exports = router;