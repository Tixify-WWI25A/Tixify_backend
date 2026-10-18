// Basiert auf unserem app.js / config/server.js (Express-App, Routen mit app.use('/api/…') einhängen).
// Mit KI überarbeitet (KI-Log Nr. 8): Weiterleitung an catalog und orders, Zwischenspeicher, CORS nur für unsere Frontends, helmet, Request-ID; Events, Warenkorb, Geocoding und Frontend-Dateien in eigene Repos verschoben.
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { createLoginLimiter } = require('./middleware/rateLimit');
const { createProxies } = require('./middleware/proxy');
const { ResponseCache } = require('./services/responseCache');
const { authRoutes } = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

/**
 * Das gateway ist die einzige Adresse, die die Frontends kennen.
 *   /api/auth, /api/users        → hier im gateway (identity: handlers/, routes/)
 *   /api/events, /api/geocode,
 *   /graphql                     → catalog-Service    (middleware/proxy.js)
 *   /api/cart, /api/orders,
 *   /api/tickets                 → orders-Service     (middleware/proxy.js)
 *   /internal/...                → nirgendwohin (404)
 */

function corsOptions() {
  const allowed = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.length === 0) {
    if (process.env.NODE_ENV === 'production') console.warn('[gateway] CORS_ORIGINS ist leer – alle Herkünfte erlaubt.');
    return { origin: true };
  }
  return { origin: allowed };
}

/**
 * Baut die App, ohne sie zu starten – so können Tests sie direkt mit supertest aufrufen.
 * @param {object} [options]
 * @param {string} [options.catalogUrl]  Standard: CATALOG_URL
 * @param {string} [options.ordersUrl]   Standard: ORDERS_URL
 * @param {number} [options.loginLimit]  Login-Versuche pro 15 Minuten (Standard 10)
 * @param {number} [options.cacheTtlMs]  Standard 30 s
 */
function createApp(options = {}) {
  const catalogUrl = options.catalogUrl || process.env.CATALOG_URL;
  const ordersUrl = options.ordersUrl || process.env.ORDERS_URL;
  const app = express();
  const cache = new ResponseCache({ ttlMs: options.cacheTtlMs ?? 30000 });
  const proxies = createProxies({ catalogUrl, ordersUrl, cache });

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Heroku-Router davor: echte Client-IP für die Login-Bremse
  app.use(helmet());
  app.use(cors(corsOptions()));
  app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  });

  app.get('/health', async (_req, res) => {
    const ping = async (url) => {
      try {
        const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
        return r.ok ? 'ok' : 'error';
      } catch {
        return 'unreachable';
      }
    };
    const [catalog, orders] = await Promise.all([ping(catalogUrl), ping(ordersUrl)]);
    const healthy = catalog === 'ok' && orders === 'ok';
    res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', service: 'gateway', upstreams: { catalog, orders }, cache: cache.stats() });
  });

  // Weiterleitungen VOR express.json(): der Request-Body wird unverändert durchgereicht
  app.use(proxies.serveFromCache);
  app.use(proxies.catalog);
  app.use(proxies.orders);

  app.use(express.json({ limit: '20kb' }));
  app.use('/api/auth', authRoutes({ loginLimiter: createLoginLimiter(options.loginLimit ?? 10) }));
  app.use('/api/users', userRoutes.router);

  app.use(notFound);
  app.use(errorHandler);
  app.locals.cache = cache;
  return app;
}

module.exports = { createApp };
