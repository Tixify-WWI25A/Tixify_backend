# Tixify gateway

**Die Eingangstür von Tixify.** Beide Frontends (MPA und SPA) sprechen nur mit dieser Adresse.
Das gateway leitet jede Anfrage an den zuständigen Service weiter und enthält zusätzlich den
**identity-Service** (Registrierung, Login, Benutzerverwaltung).

Live: https://tixify-c7a903638236.herokuapp.com/health
Frontends: [MPA](https://tixify-wwi25a.github.io/Tixify_frontend/) · [Admin-SPA](https://tixify-wwi25a.github.io/tixify-frontend-spa/)

| Repo | Aufgabe | Heroku-App |
|---|---|---|
| **Tixify_backend** (gateway) | **Eingangstür, Login, Benutzer** | `tixify` |
| tixify-catalog | Events, GraphQL, Reservierungen | `tixify-catalog` |
| tixify-orders | Warenkorb, PayPal, Bestellungen, Mails | `tixify-orders` (`web` + `worker`) |

```
 MPA / SPA ──► gateway (tixify) ──┬─► identity  (im selben Prozess, Schema identity)
                                  ├─► catalog   /api/events, /api/geocode, /graphql
                                  └─► orders    /api/cart, /api/orders
                                  ✕   /internal/…  (nur Service-zu-Service, nie von außen)
```

## Was das gateway macht

| Aufgabe | Wie | Warum |
|---|---|---|
| Weiterleiten | `http-proxy-middleware`, Pfadliste in `src/middleware/proxy.js` | Frontends kennen nur eine Adresse; Services sind austauschbar |
| `/internal` sperren | steht in keiner Liste → 404 | Reservierungs-API des catalog ist nur für orders gedacht |
| Zwischenspeichern | HashMap mit Ablaufzeit (30 s, max. 200 Einträge) für `GET /api/events*` ohne Login | Startseite fragt nicht bei jedem Besucher die Datenbank ab |
| Cache leeren | nach jeder erfolgreichen Änderung am catalog | niemand sieht veraltete Events |
| CORS | nur Frontends aus `CORS_ORIGINS` | fremde Seiten können die API nicht im Namen der Nutzer aufrufen |
| Login-Bremse | 10 Versuche pro IP in 15 Minuten | gegen Passwort-Raten |
| Sicherheits-Header | `helmet` | Standardschutz (nosniff, HSTS, …) |
| Request-ID | `X-Request-Id` an jeden Service weitergeben | eine Anfrage in allen Logs wiederfinden |
| Ausfälle | 502 mit verständlicher Meldung, `/health` meldet `degraded` | Frontend kann sinnvoll reagieren |

## Aufbau

Gleiche Grundstruktur wie unser ursprüngliches Backend – **ein Handler pro Anwendungsfall**, Routen als Tabelle –
und in allen drei Backend-Repos gleich aufgebaut:

```
src/
  app.js                        Express-App: Weiterleitung, Cache, Routen-Dateien einhängen
  server.js                     Start und sauberes Herunterfahren
  config/db.js                  Datenbankverbindung (Schema identity)
  config/redis.js               Redis-Verbindung für die Queue
  middleware/auth.js            checkLogin, requireAdmin, requireInternal (identisch in allen drei Repos)
  middleware/errorHandler.js    HttpError und einheitliche Fehlerantwort
  middleware/proxy.js           Weiterleitung an catalog und orders (Pfadliste an einer Stelle)
  middleware/rateLimit.js       Login-Bremse
  routes/authRoutes.js          /api/auth  → RegisterHandler, LoginHandler
  routes/userRoutes.js          /api/users → GetMe-, GetUsers-, UpdateUserRole-, DeleteUserHandler
  routes/*Routes.js             Routen-Tabelle + eigene Schleife (übergibt die Middlewares)
  handlers/                     ein Handler pro Anwendungsfall (Namen wie im ursprünglichen Backend)
  repositories/userRepository.js  einzige Stelle mit SQL
  validation/userValidation.js  E-Mail, Passwort, Rollen
  services/eventBus.js          Veröffentlichen in die Queue (user.registered)
  services/responseCache.js     HashMap-Zwischenspeicher für Event-Abfragen
db/schema.sql                   Schema "identity"
db/migrations/                  Umzug der bestehenden Heroku-Daten
scripts/set-admin.js            ersten Admin festlegen
```

Neu gegenüber dem ursprünglichen Backend:
- **`repositories/`**: SQL steht an einer Stelle statt in jedem Handler.
- **`middleware/errorHandler.js`**: Handler werfen `HttpError`, die Antwort hat immer das Format `{ error, details? }`.
- **Routen-Schleife** (in jeder `routes/*Routes.js`): übergibt die Middlewares
  wirklich (im alten `eventRoutes.js` fehlte das, Admin-Routen waren ohne Login erreichbar).
- `config/auth.js` und `config/requireAdmin.js` heißen jetzt `middleware/auth.js` (`checkLogin`, `requireAdmin`, `requireInternal`).

## identity-Endpunkte

Vollständig in [`docs/openapi.yaml`](docs/openapi.yaml).

| Methode | Pfad | Wer | Zweck |
|---|---|---|---|
| POST | `/api/auth/register` | alle | Konto anlegen (Willkommensmail asynchron über die Queue) |
| POST | `/api/auth/login` | alle | Token holen (JWT, 1 Stunde) |
| GET | `/api/users/me` | angemeldet | eigene Daten |
| GET | `/api/users` | Admin | alle Nutzer |
| PATCH | `/api/users/:id/role` | Admin | Rolle ändern (`customer`, `organizer`, `admin`) |
| DELETE | `/api/users/:id` | Admin | Nutzer löschen |

Das Token enthält `{ userId, email, role }`. catalog und orders prüfen es mit demselben `JWT_SECRET`
selbst – sie müssen dafür nicht beim gateway nachfragen.

Den **ersten Admin** gibt es nicht über die API (sonst könnte sich jeder selbst dazu machen):

```bash
heroku run -a tixify npm run set-admin -- chefin@tixify.de
```

## Lokal starten

Voraussetzung: Node 20+, PostgreSQL, Redis, und catalog (Port 3001) sowie orders (Port 3002) laufen.

```bash
npm install
cp .env.example .env            # Werte eintragen
psql "$DATABASE_URL" -f db/schema.sql
npm start                       # http://localhost:3000
```

## Tests

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/tixify_test npm test
```

**Achtung:** Die Datenbank-Tests löschen das Schema `identity`. Nie gegen die Heroku-Datenbank laufen lassen.
Ohne `DATABASE_URL` laufen nur die Tests ohne Datenbank (Weiterleitung, Cache, CORS).

| Datei | Prüft |
|---|---|
| `tests/identity.api.test.js` | Registrierung, Login, Rechte (401/403), Benutzerverwaltung, gleichzeitige Registrierung, Login-Bremse |
| `tests/proxy.test.js` | jede Route landet beim richtigen Service, `/internal` gesperrt, Header/Body kommen an, 502, `/health`, Cache inkl. Leeren, CORS |
| `tests/responseCache.test.js` | Ablaufzeit, Obergrenze, Treffer-Statistik |
| `tests/migration.test.js` | Migration 003 an einer Nachbildung der alten Tabelle, Abbruch bei doppelten E-Mails |

Die CI (`.github/workflows/ci.yml`) führt alle Tests bei jedem Push mit echter PostgreSQL und Redis aus
und speichert den Abdeckungsbericht als Artefakt.

## Umgebungsvariablen

| Name | Pflicht | Bedeutung |
|---|---|---|
| `DATABASE_URL` | ja | Postgres (gemeinsame Datenbank, dieses Repo nutzt nur Schema `identity`) |
| `JWT_SECRET` | ja | identisch in allen drei Repos |
| `REDIS_URL` | ja | Queue für die Willkommensmail |
| `CATALOG_URL` | ja | z. B. `https://tixify-catalog-xxxx.herokuapp.com` |
| `ORDERS_URL` | ja | z. B. `https://tixify-orders-xxxx.herokuapp.com` |
| `CORS_ORIGINS` | empfohlen | kommagetrennte Frontend-Adressen; leer = alle erlaubt |
| `JWT_EXPIRES_IN` | nein | Standard `1h` |
| `CACHE_TTL_MS` | nein | Lebensdauer des Event-Caches, Standard `30000` (30 s) |

## Umzug der bestehenden Datenbank

Reihenfolge: `001` (tixify-catalog) → `002` (tixify-orders) → `003` (dieses Repo). Vorher immer ein Backup:

```bash
heroku pg:backups:capture -a tixify
heroku pg:psql -a tixify < db/migrations/003_move_users_to_identity.sql
```

Die Migration läuft in einer Transaktion. Bricht sie ab (z. B. weil eine E-Mail in zwei Schreibweisen existiert),
bleibt alles unverändert.

## KI-Einsatz

Architektur-Grundlage und Grundstruktur (ein Handler pro Anwendungsfall, Routen als Tabelle) stammen aus unserem
ursprünglichen Backend. Die Aufteilung in drei Services, die Sicherheitskorrekturen, die Tests und die neuen Bausteine
wurden mit KI-Unterstützung (Claude) erstellt und vom Team geprüft. Jede Datei sagt im Kopfkommentar, worauf sie
basiert und was mit KI geändert oder neu erstellt wurde, und verweist auf die Nummer im KI-Log.
