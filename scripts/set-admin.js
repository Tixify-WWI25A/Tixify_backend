// Basiert auf unserem setAdmin.js (Nutzer per Skript zum Admin machen).
// Mit KI überarbeitet (KI-Log Nr. 8): E-Mail als Aufrufparameter, Schema identity.
/**
 * Macht einen registrierten Nutzer zum Admin (es gibt bewusst keinen Endpunkt, mit dem man
 * sich selbst zum Admin macht – der erste Admin entsteht so):
 *   heroku run -a tixify npm run set-admin -- chefin@tixify.de
 */
const pool = require('../src/config/db');

(async () => {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.error('Aufruf: npm run set-admin -- <email>');
    process.exit(1);
  }
  const { rows } = await pool.query("UPDATE users SET role = 'admin' WHERE email = $1 RETURNING user_id", [email]);
  console.log(rows[0] ? `${email} ist jetzt Admin (user_id ${rows[0].user_id}).` : `Kein Nutzer mit ${email} gefunden.`);
  await pool.end();
  process.exit(rows[0] ? 0 : 1);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
