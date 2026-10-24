// Mit KI erstellt (KI-Log Nr. 8), vom Team geprüft.
const request = require('supertest');
const { createApp } = require('../src/app');
const { startFakeUpstream } = require('./helpers/fakeUpstream');

/**
 * Weiterleitung: Statt der echten Services laufen zwei Mini-Server (fakeUpstream),
 * die jede Anfrage protokollieren. So lässt sich genau prüfen, was das gateway weitergibt.
 * Braucht keine Datenbank.
 */
describe('gateway: Weiterleitung an catalog und orders', () => {
  let catalog;
  let orders;
  let app;

  beforeAll(async () => {
    catalog = await startFakeUpstream('catalog', (call) => {
      if (call.url.startsWith('/api/events/404')) return { status: 404, json: { error: 'Event nicht gefunden.' } };
      return null;
    });
    orders = await startFakeUpstream('orders');
  });

  beforeEach(() => {
    catalog.calls.length = 0;
    orders.calls.length = 0;
    app = createApp({ catalogUrl: catalog.url, ordersUrl: orders.url });
  });

  afterAll(async () => {
    await catalog.close();
    await orders.close();
  });

  test.each([
    ['get', '/api/events', 'catalog'],
    ['get', '/api/events/7?x=1', 'catalog'],
    ['get', '/api/geocode?q=Mosbach', 'catalog'],
    ['post', '/graphql', 'catalog'],
    ['get', '/api/cart', 'orders'],
    ['put', '/api/cart/items/3', 'orders'],
    ['post', '/api/orders/create-paypal-order', 'orders'],
    ['get', '/api/orders/my-bookings', 'orders'],
    ['post', '/api/tickets/check-in', 'orders']
  ])('%s %s → %s (Pfad unverändert)', async (method, path, target) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(200);
    expect(res.body.service).toBe(target);
    expect(res.body.url).toBe(path);
  });

  test.each([
    '/internal/reservations',
    '/internal/reservations/1/confirm',
    '/api/eventsXYZ',
    '/api/internal/foo'
  ])('%s wird NICHT weitergeleitet → 404', async (path) => {
    const res = await request(app).post(path);
    expect(res.status).toBe(404);
    expect(catalog.calls).toHaveLength(0);
    expect(orders.calls).toHaveLength(0);
  });

  test('Body, Authorization-Header und Request-ID kommen beim Service an', async () => {
    const body = { query: '{ events { id } }' };
    const res = await request(app).post('/graphql').set('Authorization', 'Bearer abc').set('X-Request-Id', 'req-42').send(body);
    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBe('req-42');
    const [call] = catalog.calls;
    expect(JSON.parse(call.body)).toEqual(body);
    expect(call.headers.authorization).toBe('Bearer abc');
    expect(call.headers['x-request-id']).toBe('req-42');
  });

  test('ohne mitgeschickte ID vergibt das gateway eine Request-ID', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(orders.calls[0].headers['x-request-id']).toBe(res.headers['x-request-id']);
  });

  test('Fehlerstatus des Service wird unverändert durchgereicht', async () => {
    const res = await request(app).get('/api/events/404');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Event nicht gefunden.');
  });

  test('Service nicht erreichbar → 502 mit verständlicher Meldung', async () => {
    const broken = createApp({ catalogUrl: 'http://127.0.0.1:1', ordersUrl: 'http://127.0.0.1:1' });
    const res = await request(broken).get('/api/cart');
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/orders/);
  });

  test('Sicherheits-Header (helmet) sind gesetzt, x-powered-by nicht', async () => {
    const res = await request(app).get('/api/events');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  describe('/health', () => {
    test('beide Services erreichbar → 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.upstreams).toEqual({ catalog: 'ok', orders: 'ok' });
    });

    test('ein Service fehlt → 503 "degraded"', async () => {
      const half = createApp({ catalogUrl: catalog.url, ordersUrl: 'http://127.0.0.1:1' });
      const res = await request(half).get('/health');
      expect(res.status).toBe(503);
      expect(res.body).toMatchObject({ status: 'degraded', upstreams: { catalog: 'ok', orders: 'unreachable' } });
    });
  });

  describe('Cache für Event-Abfragen (HashMap im BFF)', () => {
    test('zweite gleiche Abfrage kommt aus dem Cache, ohne den catalog zu fragen', async () => {
      const first = await request(app).get('/api/events?category=Sport');
      const second = await request(app).get('/api/events?category=Sport');
      expect(first.headers['x-cache']).toBe('MISS');
      expect(second.headers['x-cache']).toBe('HIT');
      expect(second.body).toEqual(first.body);
      expect(catalog.calls).toHaveLength(1);
    });

    test('andere Query = anderer Cache-Eintrag', async () => {
      await request(app).get('/api/events?category=Sport');
      await request(app).get('/api/events?category=Theater');
      expect(catalog.calls).toHaveLength(2);
    });

    test('nach erfolgreicher Änderung (POST/PUT/PATCH/DELETE, GraphQL) wird der Cache geleert', async () => {
      for (const change of [
        () => request(app).post('/api/events').send({}),
        () => request(app).patch('/api/events/1').send({}),
        () => request(app).delete('/api/events/1'),
        () => request(app).post('/graphql').send({ query: 'mutation { deleteEvent(id: 1) }' })
      ]) {
        await request(app).get('/api/events');
        expect((await request(app).get('/api/events')).headers['x-cache']).toBe('HIT');
        await change();
        expect((await request(app).get('/api/events')).headers['x-cache']).toBe('MISS');
      }
    });

    test('Fehlerantworten werden nicht gecacht', async () => {
      await request(app).get('/api/events/404');
      await request(app).get('/api/events/404');
      expect(catalog.calls).toHaveLength(2);
    });

    test('Anfragen mit Token werden nicht gecacht (könnten nutzerspezifisch sein)', async () => {
      await request(app).get('/api/events').set('Authorization', 'Bearer abc');
      await request(app).get('/api/events').set('Authorization', 'Bearer abc');
      expect(catalog.calls).toHaveLength(2);
    });

    test('Einträge laufen nach der TTL ab', async () => {
      const short = createApp({ catalogUrl: catalog.url, ordersUrl: orders.url, cacheTtlMs: 50 });
      await request(short).get('/api/events');
      await new Promise((r) => setTimeout(r, 80));
      expect((await request(short).get('/api/events')).headers['x-cache']).toBe('MISS');
    });

    test('Warenkorb wird nie gecacht', async () => {
      await request(app).get('/api/cart');
      await request(app).get('/api/cart');
      expect(orders.calls).toHaveLength(2);
    });
  });
});

describe('CORS', () => {
  const original = process.env.CORS_ORIGINS;
  afterEach(() => {
    process.env.CORS_ORIGINS = original;
  });

  test('nur Frontends aus CORS_ORIGINS bekommen die Freigabe', async () => {
    process.env.CORS_ORIGINS = 'https://tixify-spa.example, https://tixify.example';
    const app = createApp({ catalogUrl: 'http://127.0.0.1:1', ordersUrl: 'http://127.0.0.1:1' });
    const allowed = await request(app).options('/api/auth/login').set('Origin', 'https://tixify.example').set('Access-Control-Request-Method', 'POST');
    const denied = await request(app).options('/api/auth/login').set('Origin', 'https://boese.example').set('Access-Control-Request-Method', 'POST');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://tixify.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
