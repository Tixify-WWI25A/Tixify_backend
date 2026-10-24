// Mit KI erstellt (KI-Log Nr. 8), vom Team geprüft.
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { describeWithDb } = require('./helpers/testDb');

/**
 * Prüft Migration 003 an einer Nachbildung der alten Heroku-Tabelle public.users –
 * mit den Altlasten des Monolithen: Rolle 'user', E-Mails mit Großbuchstaben.
 */
describeWithDb('Migration 003: users von public nach identity', () => {
  let pool;
  const migration = fs.readFileSync(path.join(__dirname, '../db/migrations/003_move_users_to_identity.sql'), 'utf8');

  async function oldDatabase(extraSql = '') {
    await pool.query('DROP SCHEMA IF EXISTS identity CASCADE; DROP TABLE IF EXISTS public.users CASCADE');
    await pool.query(`
      CREATE TABLE public.users (
        user_id SERIAL PRIMARY KEY, username VARCHAR(50), email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255), role VARCHAR(20) DEFAULT 'customer'
      );
      INSERT INTO public.users (username, email, password_hash, role) VALUES
        ('Alt', 'Alt.Kunde@Example.de', 'h1', 'customer'),
        ('Test', 'test@example.de', 'h2', 'user'),
        ('Chef', 'admin@example.de', 'h3', 'admin');
      ${extraSql}
    `);
  }

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterAll(async () => {
    await pool.query('DROP TABLE IF EXISTS public.users CASCADE');
    await pool.end();
  });

  test('verschiebt die Tabelle, behält IDs und Hashes, bereinigt Rollen und E-Mails', async () => {
    await oldDatabase();
    await pool.query(migration);

    const { rows: stillPublic } = await pool.query("SELECT to_regclass('public.users') IS NOT NULL AS exists");
    expect(stillPublic[0].exists).toBe(false);

    const { rows } = await pool.query('SELECT user_id, email, password_hash, role, created_at FROM identity.users ORDER BY user_id');
    expect(rows.map((r) => [r.user_id, r.email, r.password_hash, r.role])).toEqual([
      [1, 'alt.kunde@example.de', 'h1', 'customer'],
      [2, 'test@example.de', 'h2', 'customer'],
      [3, 'admin@example.de', 'h3', 'admin']
    ]);
    expect(rows[0].created_at).toBeInstanceOf(Date);
  });

  test('neue Nutzer nach der Migration: Reihenfolge der IDs läuft weiter, Regeln greifen', async () => {
    await oldDatabase();
    await pool.query(migration);
    const { rows } = await pool.query("INSERT INTO identity.users (username, email, password_hash) VALUES ('Neu', 'neu@example.de', 'h') RETURNING user_id, role");
    expect(rows[0]).toEqual({ user_id: 4, role: 'customer' });
    await expect(pool.query("INSERT INTO identity.users (username, email, password_hash) VALUES ('X', 'Gross@example.de', 'h')")).rejects.toThrow(/users_email_lowercase/);
    await expect(pool.query("INSERT INTO identity.users (username, email, password_hash, role) VALUES ('X', 'x@example.de', 'h', 'gott')")).rejects.toThrow(/users_role_valid/);
  });

  test('doppelte E-Mail in anderer Schreibweise: Abbruch, nichts verändert', async () => {
    await oldDatabase("INSERT INTO public.users (username, email, password_hash) VALUES ('Doppelt', 'TEST@example.de', 'h4');");
    await expect(pool.query(migration)).rejects.toThrow(/mehrfach/);
    await pool.query('ROLLBACK').catch(() => {});

    const { rows } = await pool.query("SELECT to_regclass('public.users') IS NOT NULL AS exists, to_regclass('identity.users') IS NOT NULL AS moved");
    expect(rows[0]).toEqual({ exists: true, moved: false });
  });
});
