const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('Fehler beim Verbinden zur Datenbank:', err.stack);
  } else {
    console.log('Erfolgreich mit Heroku Postgres verbunden!');
    release();
  }
});

module.exports = pool;