// Basiert auf unserem config/server.js (Express-Server starten).
// Mit KI überarbeitet (KI-Log Nr. 8): Prüfung der Umgebungsvariablen beim Start, sauberes Herunterfahren bei Neustart durch Heroku.
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL', 'CATALOG_URL', 'ORDERS_URL'];

function main() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length) {
    console.error(`[gateway] Fehlende Umgebungsvariablen: ${missing.join(', ')}`);
    process.exit(1);
  }

  const { createApp } = require('./app');
  const pool = require('./config/db');
  const { closeEventBus } = require('./services/eventBus');

  const app = createApp();
  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, () => console.log(`[gateway] läuft auf Port ${port}`));

  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    console.log('[gateway] Fahre herunter …');
    server.close(async () => {
      await closeEventBus();
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main();
