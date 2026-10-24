// Basiert auf unserem SQL aus handlers/LoginHandler, RegisterHandler und den User-Handlern (Abfragen auf die Tabelle users).
// Mit KI überarbeitet (KI-Log Nr. 8): an einer Stelle gesammelt; doppelte E-Mail wird über einen Datenbank-Index erkannt (409); Passwort-Hash verlässt das Modul nur für den Login.
// Als Klasse umgebaut, passend zu unseren Handler-Klassen (KI-Log Nr. 9).
const pool = require('../config/db');
const { HttpError } = require('../middleware/errorHandler');

/**
 * Einzige Stelle mit SQL für Nutzer (Repository-Muster).
 * Das Passwort-Hash verlässt diese Klasse nur für den Login-Vergleich.
 */
class UserRepository {
  /** Datenbankzeile → Nutzer, wie ihn die API zurückgibt (ohne Passwort-Hash) */
  toUser(row) {
    if (!row) return null;
    return {
      id: row.user_id,
      name: row.username,
      email: row.email,
      role: row.role,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
    };
  }

  async createUser({ username, email, passwordHash }) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, 'customer') RETURNING *`,
        [username, email, passwordHash]
      );
      return this.toUser(rows[0]);
    } catch (err) {
      // Eindeutiger Index auf email: greift auch, wenn zwei Registrierungen gleichzeitig ankommen
      if (err.code === '23505') throw new HttpError(409, 'Diese E-Mail-Adresse ist bereits registriert.');
      throw err;
    }
  }

  /** Für den Login: Nutzer inklusive Passwort-Hash */
  async findForLogin(email) {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows[0]) return null;
    return { ...this.toUser(rows[0]), passwordHash: rows[0].password_hash };
  }

  async getUser(id) {
    const { rows } = await pool.query('SELECT * FROM users WHERE user_id = $1', [id]);
    return this.toUser(rows[0]);
  }

  async listUsers() {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY user_id');
    return rows.map((row) => this.toUser(row));
  }

  async setRole(id, role) {
    const { rows } = await pool.query('UPDATE users SET role = $2 WHERE user_id = $1 RETURNING *', [id, role]);
    return this.toUser(rows[0]);
  }

  async deleteUser(id) {
    const { rowCount } = await pool.query('DELETE FROM users WHERE user_id = $1', [id]);
    return rowCount > 0;
  }
}

// Eine gemeinsame Instanz: Handler nutzen sie wie bisher, z. B. users.findForLogin(email)
module.exports = new UserRepository();
