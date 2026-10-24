// Basiert auf unserem routes/userRoutes.js (Routen-Tabelle für die Benutzerverwaltung).
// Mit KI überarbeitet (KI-Log Nr. 8): Middlewares werden in der Schleife wirklich angewendet (F-01), neue Route /me.
const express = require('express');
const { admin, loggedIn } = require('../middleware/auth');

/** /api/users – wer welche Rechte braucht, steht direkt in der Zeile */
const routes = [
  ['get',    '/me',       'GetMeHandler',          loggedIn],
  ['get',    '/',         'GetUsersHandler',       admin],
  ['patch',  '/:id/role', 'UpdateUserRoleHandler', admin],
  ['delete', '/:id',      'DeleteUserHandler',     admin]
];

const router = express.Router();

routes.forEach(([method, path, handlerName, middlewares = []]) => {
  const HandlerClass = require(`../handlers/${handlerName}`);
  const handlerInstance = new HandlerClass();
  router[method](path, ...middlewares, (req, res) => handlerInstance.execute(req, res));
});

module.exports = { routes, router };
