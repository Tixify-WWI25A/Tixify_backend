// Mit KI erstellt (KI-Log Nr. 8), vom Team geprüft.
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

/**
 * Hilfen für Tests gegen eine ECHTE PostgreSQL-Datenbank.
 * Ohne DATABASE_URL werden die Datenbank-Tests übersprungen.
 * ACHTUNG: resetSchema löscht das Schema identity – nie gegen die Produktionsdatenbank laufen lassen.
 */
const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip;

const SCHEMA_SQL = fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8');

async function resetSchema(pool) {
  await pool.query('DROP SCHEMA IF EXISTS identity CASCADE');
  await pool.query(SCHEMA_SQL);
}

const token = (userId, role = 'customer', opts = {}) =>
  jwt.sign({ userId, email: `nutzer${userId}@tixify.test`, role }, process.env.JWT_SECRET, { algorithm: 'HS256', ...opts });

const bearer = (userId, role) => `Bearer ${token(userId, role)}`;

module.exports = { describeWithDb, resetSchema, token, bearer };
