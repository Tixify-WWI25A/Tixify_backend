// Mit KI erstellt (KI-Log Nr. 8), vom Team geprüft.
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { describeWithDb, resetSchema, bearer } = require('./helpers/testDb');

/**
 * identity-Service gegen eine echte PostgreSQL-Datenbank:
 * Registrierung, Login, eigenes Profil, Benutzerverwaltung durch Admins.
 */
describeWithDb('identity: Registrierung, Login, Benutzerverwaltung', () => {
  let app;
  let pool;
  let closeEventBus;

  beforeAll(async () => {
    pool = require('../src/config/db');
    ({ closeEventBus } = require('../src/services/eventBus'));
    const { createApp } = require('../src/app');
    app = createApp({ loginLimit: 1000 });
  });

  beforeEach(async () => {
    await resetSchema(pool);
  });

  afterAll(async () => {
    await closeEventBus();
    await pool.end();
  });

  const register = (body) => request(app).post('/api/auth/register').send(body);
  const login = (email, password) => request(app).post('/api/auth/login').send({ email, password });
  const valid = { username: 'Mia', email: 'Mia@Example.DE', password: 'geheim123' };

  async function makeAdmin(email) {
    await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
  }

  describe('POST /api/auth/register', () => {
    test('legt einen Kunden an, speichert die E-Mail kleingeschrieben und gibt kein Passwort zurück', async () => {
      const res = await register(valid);
      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({ name: 'Mia', email: 'mia@example.de', role: 'customer' });
      expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);

      const { rows } = await pool.query('SELECT password_hash FROM users');
      expect(rows[0].password_hash).toMatch(/^\$2[aby]\$10\$/); // bcrypt, nicht im Klartext
    });

    test('akzeptiert "name" statt "username" (altes Frontend)', async () => {
      const res = await register({ name: 'Ben', email: 'ben@example.de', password: 'geheim123' });
      expect(res.status).toBe(201);
      expect(res.body.user.name).toBe('Ben');
    });

    test('dieselbe E-Mail in anderer Schreibweise → 409', async () => {
      await register(valid);
      const res = await register({ ...valid, email: 'MIA@example.de' });
      expect(res.status).toBe(409);
    });

    test('zwei gleichzeitige Registrierungen mit derselben E-Mail → genau eine gewinnt', async () => {
      const results = await Promise.all([register(valid), register(valid)]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    });

    test.each([
      [{ ...valid, username: 'M' }, 'username'],
      [{ ...valid, email: 'keine-mail' }, 'email'],
      [{ ...valid, password: 'kurz' }, 'password'],
      [{ ...valid, password: 'x'.repeat(73) }, 'password'],
      [{ ...valid, password: 12345678 }, 'password']
    ])('ungültige Eingabe %# → 400 mit Hinweis auf das Feld', async (body, field) => {
      const res = await register(body);
      expect(res.status).toBe(400);
      expect(res.body.details).toHaveProperty(field);
    });

    test('kaputtes JSON → 400 statt 500', async () => {
      const res = await request(app).post('/api/auth/register').set('Content-Type', 'application/json').send('{"email":');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await register(valid);
    });

    test('liefert ein gültiges Token mit userId, email und role (Format für catalog und orders)', async () => {
      const res = await login('mia@example.de', 'geheim123');
      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ email: 'mia@example.de', role: 'customer' });
      const payload = jwt.verify(res.body.token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      expect(payload).toMatchObject({ userId: res.body.user.id, email: 'mia@example.de', role: 'customer' });
      expect(payload.exp - payload.iat).toBe(3600);
    });

    test('Groß-/Kleinschreibung der E-Mail ist egal (Fehler im alten Backend)', async () => {
      const res = await login('  MIA@EXAMPLE.DE ', 'geheim123');
      expect(res.status).toBe(200);
    });

    test('falsches Passwort und unbekannte E-Mail geben dieselbe Antwort', async () => {
      const wrong = await login('mia@example.de', 'falsch123');
      const unknown = await login('niemand@example.de', 'geheim123');
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body).toEqual(unknown.body);
    });

    test('fehlende Felder → 400', async () => {
      expect((await request(app).post('/api/auth/login').send({ email: 'mia@example.de' })).status).toBe(400);
    });
  });

  describe('Zugriffsrechte', () => {
    test('alle Nutzer-Endpunkte verlangen ein Token', async () => {
      const calls = [
        request(app).get('/api/users/me'),
        request(app).get('/api/users'),
        request(app).patch('/api/users/1/role').send({ role: 'admin' }),
        request(app).delete('/api/users/1')
      ];
      for (const res of await Promise.all(calls)) expect(res.status).toBe(401);
    });

    test('Kunden und Veranstalter dürfen die Benutzerverwaltung nicht nutzen', async () => {
      for (const role of ['customer', 'organizer']) {
        const auth = bearer(1, role);
        expect((await request(app).get('/api/users').set('Authorization', auth)).status).toBe(403);
        expect((await request(app).patch('/api/users/2/role').set('Authorization', auth).send({ role: 'admin' })).status).toBe(403);
        expect((await request(app).delete('/api/users/2').set('Authorization', auth)).status).toBe(403);
      }
    });

    test('abgelaufenes oder gefälschtes Token → 401', async () => {
      const expired = jwt.sign({ userId: 1, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: -10 });
      const forged = jwt.sign({ userId: 1, role: 'admin' }, 'falsches-geheimnis');
      expect((await request(app).get('/api/users').set('Authorization', `Bearer ${expired}`)).status).toBe(401);
      expect((await request(app).get('/api/users').set('Authorization', `Bearer ${forged}`)).status).toBe(401);
    });
  });

  describe('Profil und Benutzerverwaltung', () => {
    let adminToken;
    let adminId;
    let customerId;

    beforeEach(async () => {
      await register({ username: 'Admin', email: 'admin@tixify.test', password: 'adminpass1' });
      await makeAdmin('admin@tixify.test');
      const res = await login('admin@tixify.test', 'adminpass1');
      adminToken = `Bearer ${res.body.token}`;
      adminId = res.body.user.id;
      customerId = (await register(valid)).body.user.id;
    });

    test('GET /api/users/me liefert die aktuellen Daten', async () => {
      const res = await request(app).get('/api/users/me').set('Authorization', adminToken);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: adminId, role: 'admin' });
    });

    test('GET /api/users/me für gelöschten Nutzer → 404', async () => {
      const res = await request(app).get('/api/users/me').set('Authorization', bearer(9999, 'customer'));
      expect(res.status).toBe(404);
    });

    test('Admin sieht alle Nutzer – ohne Passwort-Hashes', async () => {
      const res = await request(app).get('/api/users').set('Authorization', adminToken);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
    });

    test('Admin ändert eine Rolle', async () => {
      const res = await request(app).patch(`/api/users/${customerId}/role`).set('Authorization', adminToken).send({ role: 'organizer' });
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('organizer');
    });

    test('ungültige Rolle → 400, unbekannter Nutzer → 404, ungültige ID → 400', async () => {
      const set = (id, role) => request(app).patch(`/api/users/${id}/role`).set('Authorization', adminToken).send({ role });
      expect((await set(customerId, 'superuser')).status).toBe(400);
      expect((await set(9999, 'organizer')).status).toBe(404);
      expect((await set('abc', 'organizer')).status).toBe(400);
    });

    test('Admin kann sich nicht selbst die Admin-Rechte entziehen oder sich selbst löschen', async () => {
      const demote = await request(app).patch(`/api/users/${adminId}/role`).set('Authorization', adminToken).send({ role: 'customer' });
      const del = await request(app).delete(`/api/users/${adminId}`).set('Authorization', adminToken);
      expect(demote.status).toBe(409);
      expect(del.status).toBe(409);
    });

    test('Admin löscht einen Nutzer', async () => {
      const res = await request(app).delete(`/api/users/${customerId}`).set('Authorization', adminToken);
      expect(res.status).toBe(204);
      expect((await request(app).delete(`/api/users/${customerId}`).set('Authorization', adminToken)).status).toBe(404);
    });
  });

  describe('Schutz vor Passwort-Raten', () => {
    test('nach 3 Versuchen (Test-Limit) antwortet der Login mit 429', async () => {
      const { createApp } = require('../src/app');
      const strict = createApp({ loginLimit: 3 });
      const statuses = [];
      for (let i = 0; i < 4; i++) {
        statuses.push((await request(strict).post('/api/auth/login').send({ email: 'x@example.de', password: 'falsch123' })).status);
      }
      expect(statuses).toEqual([401, 401, 401, 429]);
    });
  });
});
