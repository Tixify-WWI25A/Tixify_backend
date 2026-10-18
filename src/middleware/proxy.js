// Mit KI erstellt (KI-Log Nr. 8), vom Team geprüft.
const { createProxyMiddleware, responseInterceptor } = require('http-proxy-middleware');

/**
 * Weiterleitung an die Fach-Services. Welche Pfade wohin gehen, steht hier an EINER Stelle.
 * /internal/... steht bewusst in keiner Liste: Service-zu-Service-Endpunkte sind von außen nie erreichbar.
 */
const ROUTES = {
  catalog: ['/api/events', '/api/geocode', '/graphql'],
  orders: ['/api/cart', '/api/orders', '/api/tickets']
};

const TIMEOUT_MS = 15000;

function matches(path, prefixes) {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`));
}

/** Einheitliche Fehlerantwort, wenn ein Service nicht erreichbar ist */
function onProxyError(serviceName) {
  return (err, req, res) => {
    console.error(`[gateway] ${serviceName} nicht erreichbar (${req.method} ${req.originalUrl}):`, err.code || err.message);
    if (res.headersSent) return res.end();
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Der Dienst „${serviceName}“ ist gerade nicht erreichbar. Bitte später erneut versuchen.` }));
  };
}

/**
 * @param {object} options
 * @param {string} options.catalogUrl
 * @param {string} options.ordersUrl
 * @param {import('./responseCache').ResponseCache} options.cache
 */
function createProxies({ catalogUrl, ordersUrl, cache }) {
  const common = {
    changeOrigin: true,
    proxyTimeout: TIMEOUT_MS,
    timeout: TIMEOUT_MS,
    on: {
      // Request-ID weitergeben: dieselbe ID taucht in den Logs aller beteiligten Services auf
      proxyReq: (proxyReq, req) => proxyReq.setHeader('X-Request-Id', req.id)
    }
  };

  const catalog = createProxyMiddleware({
    ...common,
    target: catalogUrl,
    pathFilter: (path) => matches(path, ROUTES.catalog),
    selfHandleResponse: true,
    on: {
      ...common.on,
      error: onProxyError('catalog'),
      proxyRes: responseInterceptor(async (buffer, proxyRes, req) => {
        const ok = proxyRes.statusCode < 400;
        if (req.method === 'GET' && ok && req.cacheKey) {
          cache.set(req.cacheKey, { status: proxyRes.statusCode, contentType: proxyRes.headers['content-type'], body: buffer });
        }
        // Erfolgreich geändert (Event angelegt/geändert/gelöscht, GraphQL-Mutation) → Cache leeren.
        // GraphQL-Abfragen sind auch POST; den Cache dann ebenfalls zu leeren kostet wenig und ist sicher.
        if (req.method !== 'GET' && ok) cache.clear();
        return buffer;
      })
    }
  });

  const orders = createProxyMiddleware({
    ...common,
    target: ordersUrl,
    pathFilter: (path) => matches(path, ROUTES.orders),
    on: { ...common.on, error: onProxyError('orders') }
  });

  /** Antwortet aus dem Cache, bevor überhaupt weitergeleitet wird */
  function serveFromCache(req, res, next) {
    const cacheable = req.method === 'GET' && matches(req.path, ['/api/events']) && !req.headers.authorization;
    if (!cacheable) return next();
    req.cacheKey = req.originalUrl;
    const hit = cache.get(req.cacheKey);
    if (!hit) {
      res.setHeader('X-Cache', 'MISS');
      return next();
    }
    res.setHeader('X-Cache', 'HIT');
    res.status(hit.status).type(hit.contentType || 'application/json').send(hit.body);
  }

  return { catalog, orders, serveFromCache };
}

module.exports = { createProxies, ROUTES };
