// Basiert auf unserem routes/authRoutes.js (Routen-Tabelle für Registrierung und Login).
// Mit KI überarbeitet (KI-Log Nr. 8): Login-Bremse als Middleware, eigene Routen-Schleife des Teams.
const express = require('express');

/** /api/auth – Registrierung und Login. Die Login-Bremse wird von app.js übergeben (im Test einstellbar). */
function authRoutes({ loginLimiter }) {
  const routes = [
    ['post', '/register', 'RegisterHandler'],
    ['post', '/login',    'LoginHandler', [loginLimiter]]
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
