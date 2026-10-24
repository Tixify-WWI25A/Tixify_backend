// Mit KI erstellt (KI-Log Nr. 8), vom Team geprüft. Regeln aus unserem RegisterHandler und LoginHandler übernommen und erweitert.
const { HttpError } = require('../middleware/errorHandler');

/** Eingabeprüfungen rund um Nutzer – von mehreren Handlern gebraucht, deshalb an einer Stelle. */

const ROLES = ['customer', 'organizer', 'admin'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E-Mail immer getrimmt und kleingeschrieben – beim Registrieren UND beim Login (Fehler F-08) */
function normalizeEmail(raw) {
  const email = String(raw ?? '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 255) throw new HttpError(400, 'Bitte eine gültige E-Mail-Adresse angeben.');
  return email;
}

/** Prüft die Registrierungsdaten und liefert alle Fehler auf einmal (für das Formular) */
function validateRegistration(body) {
  const username = String(body?.username ?? body?.name ?? '').trim();
  const { password } = body || {};

  const errors = {};
  if (username.length < 2 || username.length > 50) errors.username = 'muss 2 bis 50 Zeichen lang sein';
  let email;
  try { email = normalizeEmail(body?.email); } catch { errors.email = 'ist keine gültige E-Mail-Adresse'; }
  // bcrypt berücksichtigt nur die ersten 72 Bytes – längere Passwörter wären trügerisch
  if (typeof password !== 'string' || password.length < 8) errors.password = 'muss mindestens 8 Zeichen lang sein';
  else if (Buffer.byteLength(password) > 72) errors.password = 'darf höchstens 72 Zeichen lang sein';
  if (Object.keys(errors).length) throw new HttpError(400, 'Ungültige Eingaben.', errors);

  return { username, email, password };
}

function parseUserId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Nutzer-ID muss eine positive ganze Zahl sein.');
  return id;
}

module.exports = { ROLES, normalizeEmail, validateRegistration, parseUserId };
